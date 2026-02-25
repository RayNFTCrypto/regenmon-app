import { regenmonTypes } from "../data/regenmonTypes";
import { SpriteDisplay } from "./SpriteDisplay";

export function BattleArena({
  battleState,
  myRegenmon,
  opponent,
  myHp,
  opponentHp,
  isMyTurn,
  battleLog,
  result,
  moves,
  onMove,
  onCancel,
  onLeave,
}) {
  const myType = regenmonTypes[myRegenmon.type];
  const oppType = opponent ? regenmonTypes[opponent.type] : null;
  const myMaxHp = myRegenmon.stats.hp;
  const oppMaxHp = opponent?.stats?.hp || 100;

  if (battleState === "searching") {
    return (
      <div className="battle-arena fade-in">
        <div className="battle-searching">
          <div className="search-spinner" />
          <h2>Buscando oponente...</h2>
          <p>Esperando a otro Aetherian</p>
          <button className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="battle-arena fade-in">
      {/* Opponent side */}
      <div className="battle-side opponent">
        <div className="battle-creature-info">
          <span className="battle-name">{opponent?.name || "???"}</span>
          {oppType && (
            <span className="battle-type-badge" style={{ color: oppType.color }}>
              {oppType.emoji} {oppType.name}
            </span>
          )}
        </div>
        <div className="battle-hp-bar">
          <div
            className="battle-hp-fill"
            style={{
              width: `${(opponentHp / oppMaxHp) * 100}%`,
              background: oppType?.color || "#fff",
            }}
          />
        </div>
        <span className="battle-hp-text">
          {opponentHp}/{oppMaxHp} HP
        </span>
        {oppType && (
          <div className="battle-sprite-container">
            <SpriteDisplay type={oppType} mood="tranquilo" size={80} />
          </div>
        )}
      </div>

      {/* VS divider */}
      <div className="battle-vs">VS</div>

      {/* My side */}
      <div className="battle-side mine">
        <div className="battle-sprite-container">
          <SpriteDisplay type={myType} mood="tranquilo" size={80} />
        </div>
        <div className="battle-creature-info">
          <span className="battle-name">{myRegenmon.name}</span>
          <span className="battle-type-badge" style={{ color: myType.color }}>
            {myType.emoji} {myType.name}
          </span>
        </div>
        <div className="battle-hp-bar">
          <div
            className="battle-hp-fill"
            style={{
              width: `${(myHp / myMaxHp) * 100}%`,
              background: myType.color,
            }}
          />
        </div>
        <span className="battle-hp-text">
          {myHp}/{myMaxHp} HP
        </span>
      </div>

      {/* Battle log (last 3) */}
      <div className="battle-log">
        {battleLog.slice(-3).map((entry, i) => (
          <div key={i} className="battle-log-entry">
            <span>{entry.emoji}</span>
            <span>
              {entry.missed
                ? `${entry.move} fall\u00f3!`
                : entry.defending
                ? `${entry.move} \u2014 Defensa activada!`
                : `${entry.move} caus\u00f3 ${entry.damage} de da\u00f1o!`}
            </span>
          </div>
        ))}
      </div>

      {/* Actions or result */}
      {battleState === "finished" ? (
        <div className="battle-result">
          <h2 className={`result-text ${result}`}>
            {result === "win" ? "VICTORIA!" : "DERROTA"}
          </h2>
          {result === "win" && <p className="reward-text">+100 REGEN</p>}
          <button
            className="btn-primary"
            onClick={onLeave}
            style={{ "--btn-color": myType.color }}
          >
            Volver
          </button>
        </div>
      ) : (
        <div className="battle-moves">
          {isMyTurn ? (
            <>
              <p className="turn-indicator">Tu turno!</p>
              <div className="moves-grid">
                {moves.map((move) => (
                  <button
                    key={move.id}
                    className="move-btn"
                    onClick={() => onMove(move)}
                    style={{ "--move-color": myType.color }}
                    title={move.description}
                  >
                    <span className="move-emoji">{move.emoji}</span>
                    <span className="move-name">{move.name}</span>
                    <span className="move-power">
                      {move.type === "defend" ? "DEF" : `PWR ${move.power}`}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="waiting-turn">
              <p>Esperando turno del oponente...</p>
              <div className="waiting-dots">
                <span
                  className="dot"
                  style={{ background: oppType?.color || "#9B30FF" }}
                />
                <span
                  className="dot"
                  style={{ background: oppType?.color || "#9B30FF" }}
                />
                <span
                  className="dot"
                  style={{ background: oppType?.color || "#9B30FF" }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
