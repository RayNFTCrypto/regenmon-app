import { CARE_STAT_LABELS } from "../data/moods";

export function CareStats({ careStats }) {
  return (
    <div className="care-stats">
      {Object.entries(CARE_STAT_LABELS).map(([key, meta]) => {
        const value = Math.round(careStats[key] || 0);
        const isLow = value <= 25;
        const isCritical = value <= 10;

        return (
          <div className="care-stat-row" key={key}>
            <span className="care-stat-icon">{meta.icon}</span>
            <div className="care-stat-bar-bg">
              <div
                className={`care-stat-bar-fill ${isLow ? "low" : ""} ${isCritical ? "critical" : ""}`}
                style={{
                  width: `${value}%`,
                  background: `linear-gradient(90deg, ${meta.color}cc, ${meta.color})`,
                  boxShadow: isLow
                    ? `0 0 8px ${meta.color}80`
                    : `0 0 4px ${meta.color}30`,
                }}
              />
            </div>
            <span
              className="care-stat-value"
              style={{ color: isCritical ? "#ef4444" : isLow ? meta.color : "#ffffff40" }}
            >
              {value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
