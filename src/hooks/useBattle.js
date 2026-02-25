import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  calculateDamage,
  determineTurnOrder,
  BATTLE_REWARD_WINNER,
} from "../lib/battleEngine";
import { BATTLE_MOVES } from "../data/battleMoves";

/**
 * Battle state machine: idle -> searching -> battling -> finished
 */
export function useBattle(regenmon) {
  const { user } = useAuth();
  const [battleState, setBattleState] = useState("idle");
  const [battle, setBattle] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [myHp, setMyHp] = useState(0);
  const [opponentHp, setOpponentHp] = useState(0);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [battleLog, setBattleLog] = useState([]);
  const [result, setResult] = useState(null);
  const [defBoost, setDefBoost] = useState(1);
  const channelRef = useRef(null);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  // Apply battle update from realtime
  const applyBattleUpdate = useCallback(
    (updated) => {
      if (!user) return;
      const amP1 = updated.player1_id === user.id;
      setMyHp(amP1 ? updated.player1_hp : updated.player2_hp);
      setOpponentHp(amP1 ? updated.player2_hp : updated.player1_hp);
      setIsMyTurn(updated.current_turn === user.id);
      setBattleLog(updated.battle_log || []);
      setDefBoost(1); // reset def boost each turn

      if (updated.status === "finished") {
        setBattleState("finished");
        setResult(updated.winner_id === user.id ? "win" : "lose");
      }
    },
    [user]
  );

  // Subscribe to a battle's realtime updates
  const subscribeToBattle = useCallback(
    async (battleId) => {
      cleanup();

      // Load full battle data with regenmon info
      const { data: battleData } = await supabase
        .from("battles")
        .select("*")
        .eq("id", battleId)
        .single();

      if (!battleData) return;

      const amP1 = battleData.player1_id === user.id;
      const oppRegenmonId = amP1
        ? battleData.player2_regenmon_id
        : battleData.player1_regenmon_id;

      // Load opponent's regenmon
      const { data: oppData } = await supabase
        .from("regenmons")
        .select("*")
        .eq("id", oppRegenmonId)
        .single();

      setBattle(battleData);
      setOpponent(
        oppData
          ? { id: oppData.id, name: oppData.name, type: oppData.type, stats: oppData.stats }
          : null
      );
      setMyHp(amP1 ? battleData.player1_hp : battleData.player2_hp);
      setOpponentHp(amP1 ? battleData.player2_hp : battleData.player1_hp);
      setIsMyTurn(battleData.current_turn === user.id);
      setBattleLog(battleData.battle_log || []);
      setBattleState("battling");

      // Subscribe to realtime updates
      channelRef.current = supabase
        .channel(`battle-${battleId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "battles",
            filter: `id=eq.${battleId}`,
          },
          (payload) => applyBattleUpdate(payload.new)
        )
        .subscribe();
    },
    [user, cleanup, applyBattleUpdate]
  );

  // Search for an opponent
  const searchForBattle = useCallback(async () => {
    if (!user || !regenmon) return;
    setBattleState("searching");

    // Check for existing waiting opponent
    const { data: waiting } = await supabase
      .from("matchmaking_queue")
      .select("*")
      .eq("status", "waiting")
      .neq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (waiting) {
      // Load opponent's regenmon stats
      const { data: oppRegenmon } = await supabase
        .from("regenmons")
        .select("*")
        .eq("id", waiting.regenmon_id)
        .single();

      if (!oppRegenmon) {
        setBattleState("idle");
        return;
      }

      const firstTurn = determineTurnOrder(regenmon.stats, oppRegenmon.stats);
      const firstPlayerId = firstTurn === 1 ? waiting.user_id : user.id;

      const { data: newBattle } = await supabase
        .from("battles")
        .insert({
          player1_id: waiting.user_id,
          player1_regenmon_id: waiting.regenmon_id,
          player2_id: user.id,
          player2_regenmon_id: regenmon.id,
          player1_hp: oppRegenmon.stats.hp,
          player2_hp: regenmon.stats.hp,
          current_turn: firstPlayerId,
          status: "active",
        })
        .select()
        .single();

      if (newBattle) {
        // Update matchmaking queue entry
        await supabase
          .from("matchmaking_queue")
          .update({ status: "matched", matched_battle_id: newBattle.id })
          .eq("id", waiting.id);

        subscribeToBattle(newBattle.id);
      }
    } else {
      // No opponent found, join queue
      await supabase.from("matchmaking_queue").upsert(
        {
          user_id: user.id,
          regenmon_id: regenmon.id,
          status: "waiting",
        },
        { onConflict: "user_id" }
      );

      // Subscribe to queue changes to detect when matched
      channelRef.current = supabase
        .channel("matchmaking-" + user.id)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "matchmaking_queue",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (
              payload.new.status === "matched" &&
              payload.new.matched_battle_id
            ) {
              subscribeToBattle(payload.new.matched_battle_id);
            }
          }
        )
        .subscribe();
    }
  }, [user, regenmon, subscribeToBattle]);

  // Execute a move
  const executeMove = useCallback(
    async (move) => {
      if (!battle || !isMyTurn || !user) return;

      const amP1 = battle.player1_id === user.id;
      const myStats = regenmon.stats;
      const oppStats = opponent?.stats || { def: 70, atk: 70 };

      const result = calculateDamage(move, myStats, oppStats, defBoost);

      const newLog = [
        ...battleLog,
        {
          turn: battle.turn_number,
          player: user.id,
          move: move.name,
          emoji: move.emoji,
          damage: result.damage,
          missed: result.missed,
          defending: result.defending,
        },
      ];

      const newOpponentHp = Math.max(0, opponentHp - result.damage);
      const isFinished = newOpponentHp <= 0;

      const updates = {
        battle_log: newLog,
        turn_number: battle.turn_number + 1,
        current_turn: amP1 ? battle.player2_id : battle.player1_id,
        [amP1 ? "player2_hp" : "player1_hp"]: newOpponentHp,
      };

      if (isFinished) {
        updates.status = "finished";
        updates.winner_id = user.id;
        updates.reward_amount = BATTLE_REWARD_WINNER;
      }

      // If defending, store boost for opponent's next attack against me
      if (result.defending) {
        setDefBoost(result.defBoost);
      }

      await supabase.from("battles").update(updates).eq("id", battle.id);

      // Optimistic local update
      setBattle((prev) => (prev ? { ...prev, ...updates } : prev));
      setOpponentHp(newOpponentHp);
      setBattleLog(newLog);
      setIsMyTurn(false);

      if (isFinished) {
        setBattleState("finished");
        setResult("win");
      }
    },
    [battle, isMyTurn, user, regenmon, opponent, opponentHp, battleLog, defBoost]
  );

  // Cancel search
  const cancelSearch = useCallback(async () => {
    cleanup();
    if (user) {
      await supabase
        .from("matchmaking_queue")
        .delete()
        .eq("user_id", user.id);
    }
    setBattleState("idle");
  }, [user, cleanup]);

  // Leave battle / go back
  const leaveBattle = useCallback(() => {
    cleanup();
    setBattle(null);
    setOpponent(null);
    setBattleState("idle");
    setResult(null);
    setBattleLog([]);
    setDefBoost(1);
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    battleState,
    battle,
    opponent,
    myHp,
    opponentHp,
    isMyTurn,
    battleLog,
    result,
    moves: BATTLE_MOVES[regenmon?.type] || [],
    searchForBattle,
    executeMove,
    cancelSearch,
    leaveBattle,
  };
}
