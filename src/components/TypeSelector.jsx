import { regenmonTypes } from "../data/regenmonTypes";

export function TypeSelector({ selected, onSelect }) {
  return (
    <div className="type-selector">
      {Object.entries(regenmonTypes).map(([key, type]) => (
        <button
          key={key}
          className={`type-card ${selected === key ? "selected" : ""}`}
          onClick={() => onSelect(key)}
          style={{ "--type-color": type.color }}
        >
          <div className="type-card-left">
            <div
              className="type-orb"
              style={{
                background: `radial-gradient(circle at 35% 35%, ${type.colorSecondary}90, ${type.color}40 55%, transparent)`,
                border: `1.5px solid ${type.color}50`,
              }}
            >
              <span className="type-emoji">{type.emoji}</span>
            </div>
          </div>
          <div className="type-card-info">
            <div className="type-card-header">
              <span className="type-name">{type.name}</span>
              <span className="type-id">{key.toUpperCase()}</span>
            </div>
            <span className="type-desc">{type.description}</span>
            <div className="type-stats-preview">
              {Object.entries(type.stats).map(([stat, val]) => (
                <span key={stat}>
                  {stat.toUpperCase()} {val}
                </span>
              ))}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
