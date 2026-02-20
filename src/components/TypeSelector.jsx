import { regenmonTypes } from "../data/regenmonTypes";

export function TypeSelector({ selected, onSelect }) {
  return (
    <div className="type-selector">
      {Object.entries(regenmonTypes).map(([key, type]) => (
        <button
          key={key}
          className={`type-card ${selected === key ? "selected" : ""}`}
          onClick={() => onSelect(key)}
          style={{
            "--type-color": type.color,
            "--type-color-light": type.colorLight,
          }}
        >
          <span className="type-emoji">{type.emoji}</span>
          <span className="type-name">{type.name}</span>
          <span className="type-desc">{type.description}</span>
          <div className="type-stats-preview">
            {Object.entries(type.stats).map(([stat, val]) => (
              <span key={stat}>
                {stat.toUpperCase()} {val}
              </span>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
