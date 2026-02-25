import { useState } from "react";
import { useBattle } from "../hooks/useBattle";
import { useCpuBattle } from "../hooks/useCpuBattle";
import { BattleArena } from "./BattleArena";
import { regenmonTypes } from "../data/regenmonTypes";

function CpuBattle({ regenmon, onBack }) {
  const {
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
  } = useCpuBattle(regenmon);

  const type = regenmonTypes[regenmon.type];

  const handleLeave = () => {
    leaveBattle();
    onBack();
  };

  if (battleState === "idle") {
    // Auto-start when entering CPU mode
    startBattle();
    return null;
  }

  return (
    <BattleArena
      battleState={battleState}
      myRegenmon={regenmon}
      opponent={opponent}
      myHp={myHp}
      opponentHp={opponentHp}
      isMyTurn={isMyTurn}
      battleLog={battleLog}
      result={result}
      moves={moves}
      onMove={executeMove}
      onCancel={handleLeave}
      onLeave={handleLeave}
    />
  );
}

function PvpBattle({ regenmon, onBack }) {
  const {
    battleState,
    battle,
    opponent,
    myHp,
    opponentHp,
    isMyTurn,
    battleLog,
    result,
    moves,
    searchForBattle,
    executeMove,
    cancelSearch,
    leaveBattle,
  } = useBattle(regenmon);

  const type = regenmonTypes[regenmon.type];

  const handleLeave = () => {
    leaveBattle();
    onBack();
  };

  if (battleState === "idle") {
    searchForBattle();
    return null;
  }

  return (
    <BattleArena
      battleState={battleState}
      myRegenmon={regenmon}
      opponent={opponent}
      myHp={myHp}
      opponentHp={opponentHp}
      isMyTurn={isMyTurn}
      battleLog={battleLog}
      result={result}
      moves={moves}
      onMove={executeMove}
      onCancel={() => { cancelSearch(); onBack(); }}
      onLeave={handleLeave}
    />
  );
}

export function BattleView({ regenmon, onBack }) {
  const [mode, setMode] = useState(null); // null | 'cpu' | 'pvp'
  const type = regenmonTypes[regenmon.type];

  if (mode === "cpu") {
    return <CpuBattle regenmon={regenmon} onBack={() => setMode(null)} />;
  }

  if (mode === "pvp") {
    return <PvpBattle regenmon={regenmon} onBack={() => setMode(null)} />;
  }

  return (
    <div className="battle-lobby fade-in">
      <h2>Arena de Batalla</h2>
      <p>Elige tu modo de combate</p>

      <div className="battle-mode-options">
        <button
          className="btn-battle-mode"
          onClick={() => setMode("cpu")}
          style={{ "--mode-color": type.color }}
        >
          <span className="mode-icon">🤖</span>
          <span className="mode-title">vs CPU</span>
          <span className="mode-desc">Batalla contra la maquina</span>
        </button>

        <button
          className="btn-battle-mode"
          onClick={() => setMode("pvp")}
          style={{ "--mode-color": "#9B30FF" }}
        >
          <span className="mode-icon">⚔️</span>
          <span className="mode-title">vs Player</span>
          <span className="mode-desc">Batalla en tiempo real</span>
        </button>
      </div>

      <button
        className="btn-secondary"
        onClick={onBack}
        style={{ marginTop: 16 }}
      >
        Volver
      </button>
    </div>
  );
}
