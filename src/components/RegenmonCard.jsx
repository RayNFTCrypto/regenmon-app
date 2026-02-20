import { regenmonTypes, statLabels } from "../data/regenmonTypes";

export function RegenmonCard({ regenmon, onRelease }) {
  const type = regenmonTypes[regenmon.type];

  return (
    <div className="regenmon-card fade-in" style={{ "--type-color": type.color }}>
      <div className="card-header">
        <h1 className="card-name">{regenmon.name}</h1>
        <span className="card-badge" style={{ background: type.color }}>
          {type.emoji} {type.name}
        </span>
      </div>

      <div className="card-sprite">
        <div className="sprite-circle" style={{ background: type.colorLight }}>
          <span className="sprite-emoji">{type.emoji}</span>
        </div>
      </div>

      <div className="card-stats">
        <h3>Estadísticas</h3>
        {Object.entries(regenmon.stats).map(([key, value]) => (
          <div className="stat-row" key={key}>
            <span className="stat-label">{statLabels[key]}</span>
            <div className="stat-bar-bg">
              <div
                className="stat-bar-fill"
                style={{
                  width: `${value}%`,
                  background: type.color,
                }}
              />
            </div>
            <span className="stat-value">{value}</span>
          </div>
        ))}
      </div>

      <div className="card-footer">
        <p className="card-created">
          Creado: {new Date(regenmon.createdAt).toLocaleDateString("es-MX")}
        </p>
        <button className="btn-release" onClick={onRelease}>
          Liberar Regenmon
        </button>
      </div>
    </div>
  );
}
