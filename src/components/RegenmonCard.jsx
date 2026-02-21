import { regenmonTypes, statLabels } from "../data/regenmonTypes";
import { getCurrentMood, MOODS } from "../data/moods";
import { SpriteDisplay } from "./SpriteDisplay";
import { CareStats } from "./CareStats";
import { ItemBar } from "./ItemBar";
import { ChatBox } from "./ChatBox";

export function RegenmonCard({ regenmon, careStats, onUseItem, onRelease }) {
  const type = regenmonTypes[regenmon.type];
  const mood = getCurrentMood(careStats);

  return (
    <div className="regenmon-card fade-in" style={{ "--type-color": type.color }}>
      {/* Header con nombre y mood */}
      <div className="card-header">
        <div className="card-badge" style={{ borderColor: type.color + "40" }}>
          <span style={{ color: type.color }}>{type.emoji}</span>
          <span style={{ color: type.color + "cc", fontSize: 10, letterSpacing: 2 }}>
            {type.name.toUpperCase()}
          </span>
        </div>
        <h1 className="card-name">{regenmon.name}</h1>
        <div className="card-mood" style={{ color: mood.color }}>
          <span>{mood.emoji}</span>
          <span className="mood-label">{mood.label}</span>
        </div>
      </div>

      {/* Sprite animado */}
      <div className="card-sprite">
        <SpriteDisplay type={type} mood={mood.id} size={110} />
      </div>

      {/* Care Stats (hambre, energía, felicidad, salud) */}
      <CareStats careStats={careStats} />

      {/* Battle Stats */}
      <div className="card-stats">
        <h3>STATS BASE</h3>
        {Object.entries(regenmon.stats).map(([key, value]) => (
          <div className="stat-row" key={key}>
            <span className="stat-label">{statLabels[key]}</span>
            <div className="stat-bar-bg">
              <div
                className="stat-bar-fill"
                style={{
                  width: `${value}%`,
                  background: `linear-gradient(90deg, ${type.color}cc, ${type.color})`,
                  boxShadow: `0 0 8px ${type.color}40`,
                }}
              />
            </div>
            <span className="stat-value">{value}</span>
          </div>
        ))}
      </div>

      {/* Items / Acciones */}
      <ItemBar onUseItem={onUseItem} typeKey={regenmon.type} />

      {/* Chat con tu criatura */}
      <ChatBox
        regenmon={regenmon}
        regenmonId={regenmon.id}
        typeKey={regenmon.type}
        type={type}
        careStats={careStats}
      />

      {/* Footer */}
      <div className="card-footer">
        <p className="card-created">
          Creado: {new Date(regenmon.createdAt).toLocaleDateString("es-MX")}
        </p>
        <button
          className="btn-release"
          onClick={onRelease}
          style={{ "--btn-color": type.color }}
        >
          Liberar criatura
        </button>
      </div>
    </div>
  );
}
