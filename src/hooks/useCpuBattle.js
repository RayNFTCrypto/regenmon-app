import { useState, useCallback, useRef } from "react";
import { BATTLE_MOVES } from "../data/battleMoves";
import { regenmonTypes } from "../data/regenmonTypes";
import { calculateDamage, determineTurnOrder } from "../lib/battleEngine";

const CPU_NAMES = ["Darkveil", "Pyrax", "Glacius", "Noctis", "Ignis", "Frostbyte"];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCpuOpponent(playerType) {
  // Pick a random type (can be same as player)
  const types = Object.keys(regenmonTypes);
  const cpuType = pickRandom(types);
  const typeData = regenmonTypes[cpuType];

  return {
    name: pickRandom(CPU_NAMES),
    type: cpuType,
    stats: { ...typeData.stats },
    isCpu: true,
  };
}

function cpuChooseMove(moves, cpuHp, maxHp) {
  // Simple AI: if HP < 30%, 40% chance to defend
  const defendMove = moves.find((m) => m.type === "defend");
  if (defendMove && cpuHp < maxHp * 0.3 && Math.random() < 0.4) {
    return defendMove;
  }
  // Otherwise pick random attack (weighted towards stronger moves)
  const attacks = moves.filter((m) => m.type === "attack");
  return pickRandom(attacks);
}

export function useCpuBattle(regenmon) {
  const [battleState, setBattleState] = useState("idle"); // idle | battling | finished
  const [opponent, setOpponent] = useState(null);
  const [myHp, setMyHp] = useState(0);
  const [opponentHp, setOpponentHp] = useState(0);
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [battleLog, setBattleLog] = useState([]);
  const [result, setResult] = useState(null);

  const myDefBoost = useRef(1);
  const cpuDefBoost = useRef(1);

  const moves = BATTLE_MOVES[regenmon.type] || BATTLE_MOVES.fuego;

  const startBattle = useCallback(() => {
    const cpu = generateCpuOpponent(regenmon.type);
    setOpponent(cpu);
    setMyHp(regenmon.stats.hp);
    setOpponentHp(cpu.stats.hp);
    setBattleLog([]);
    setResult(null);
    myDefBoost.current = 1;
    cpuDefBoost.current = 1;

    const first = determineTurnOrder(regenmon.stats, cpu.stats);
    setIsMyTurn(first === 1);
    setBattleState("battling");

    // If CPU goes first, auto-play after short delay
    if (first === 2) {
      setTimeout(() => {
        playCpuTurn(cpu, regenmon.stats.hp, cpu.stats.hp);
      }, 1200);
    }
  }, [regenmon]);

  const playCpuTurn = useCallback(
    (cpuData, currentMyHp, currentCpuHp) => {
      const cpu = cpuData || opponent;
      if (!cpu) return;

      const cpuMoves = BATTLE_MOVES[cpu.type] || BATTLE_MOVES.fuego;
      const move = cpuChooseMove(cpuMoves, currentCpuHp, cpu.stats.hp);
      const result = calculateDamage(move, cpu.stats, regenmon.stats, myDefBoost.current);

      // Reset defense boost after being attacked
      myDefBoost.current = 1;

      const logEntry = {
        attacker: cpu.name,
        move: move.name,
        emoji: move.emoji,
        damage: result.damage,
        missed: result.missed,
        defending: result.defending,
      };

      setBattleLog((prev) => [...prev, logEntry]);

      if (result.defending) {
        cpuDefBoost.current = result.defBoost;
        setIsMyTurn(true);
      } else {
        const newMyHp = Math.max(0, currentMyHp - result.damage);
        setMyHp(newMyHp);

        if (newMyHp <= 0) {
          setBattleState("finished");
          setResult("lose");
        } else {
          setIsMyTurn(true);
        }
      }
    },
    [opponent, regenmon]
  );

  const executeMove = useCallback(
    (move) => {
      if (!isMyTurn || battleState !== "battling") return;

      const result = calculateDamage(move, regenmon.stats, opponent.stats, cpuDefBoost.current);

      // Reset CPU defense boost after being attacked
      cpuDefBoost.current = 1;

      const logEntry = {
        attacker: regenmon.name,
        move: move.name,
        emoji: move.emoji,
        damage: result.damage,
        missed: result.missed,
        defending: result.defending,
      };

      setBattleLog((prev) => [...prev, logEntry]);

      if (result.defending) {
        myDefBoost.current = result.defBoost;
      } else {
        const newOppHp = Math.max(0, opponentHp - result.damage);
        setOpponentHp(newOppHp);

        if (newOppHp <= 0) {
          setBattleState("finished");
          setResult("win");
          return;
        }
      }

      // CPU turn after a delay
      setIsMyTurn(false);
      const currentMyHp = myHp;
      const currentCpuHp = opponentHp - (result.defending ? 0 : result.damage);
      setTimeout(() => {
        playCpuTurn(opponent, currentMyHp, Math.max(0, currentCpuHp));
      }, 1200);
    },
    [isMyTurn, battleState, regenmon, opponent, opponentHp, myHp, playCpuTurn]
  );

  const leaveBattle = useCallback(() => {
    setBattleState("idle");
    setOpponent(null);
    setBattleLog([]);
    setResult(null);
  }, []);

  return {
    battleState,
    opponent,
    myHp,
    opponentHp,
    isMyTurn,
    battleLog,
    result,
    moves,
    startBattle,
    executeMove,
    leaveBattle,
  };
}
