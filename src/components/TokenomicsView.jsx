export function TokenomicsView({ onBack }) {
  const TOTAL_SUPPLY = "100,000,000";

  const distribution = [
    { label: "Battle Rewards", pct: 30, color: "#FF4500", emoji: "⚔️" },
    { label: "Staking Rewards", pct: 25, color: "#00E676", emoji: "🔒" },
    { label: "Airdrop & Community", pct: 20, color: "#00B0FF", emoji: "🎁" },
    { label: "Development", pct: 15, color: "#E040FB", emoji: "🛠️" },
    { label: "Treasury", pct: 10, color: "#FFD700", emoji: "🏦" },
  ];

  // Build conic-gradient for pie chart
  let gradientParts = [];
  let cumulative = 0;
  distribution.forEach((item) => {
    gradientParts.push(`${item.color} ${cumulative}% ${cumulative + item.pct}%`);
    cumulative += item.pct;
  });
  const pieGradient = `conic-gradient(${gradientParts.join(", ")})`;

  return (
    <div className="tokenomics-view fade-in">
      <h2 className="tokenomics-title">Tokenomics</h2>
      <p className="tokenomics-subtitle">REGEN Token — Monad Testnet</p>

      {/* Supply Info */}
      <div className="tokenomics-supply">
        <div className="supply-item">
          <span className="supply-label">Total Supply</span>
          <span className="supply-value">{TOTAL_SUPPLY}</span>
        </div>
        <div className="supply-item">
          <span className="supply-label">Token</span>
          <span className="supply-value">REGEN</span>
        </div>
        <div className="supply-item">
          <span className="supply-label">Standard</span>
          <span className="supply-value">ERC-20</span>
        </div>
        <div className="supply-item">
          <span className="supply-label">NFT</span>
          <span className="supply-value">ERC-721</span>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="tokenomics-chart-wrapper">
        <div
          className="tokenomics-pie"
          style={{ background: pieGradient }}
        >
          <div className="tokenomics-pie-center">
            <span className="pie-center-label">REGEN</span>
            <span className="pie-center-value">100M</span>
          </div>
        </div>
      </div>

      {/* Distribution List */}
      <div className="tokenomics-list">
        {distribution.map((item) => (
          <div key={item.label} className="tokenomics-row">
            <div className="tokenomics-row-left">
              <span
                className="tokenomics-dot"
                style={{ background: item.color }}
              />
              <span className="tokenomics-row-emoji">{item.emoji}</span>
              <span className="tokenomics-row-label">{item.label}</span>
            </div>
            <div className="tokenomics-row-right">
              <span className="tokenomics-row-pct">{item.pct}%</span>
              <div className="tokenomics-bar-bg">
                <div
                  className="tokenomics-bar-fill"
                  style={{ width: `${item.pct}%`, background: item.color }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Utility Section */}
      <div className="tokenomics-utility">
        <h3>Utilidad del Token</h3>
        <div className="utility-grid">
          <div className="utility-item">
            <span>⚔️</span>
            <p>Recompensas por ganar batallas PvP y vs CPU</p>
          </div>
          <div className="utility-item">
            <span>🏪</span>
            <p>Comprar skins, boosts y items en el Marketplace</p>
          </div>
          <div className="utility-item">
            <span>🔒</span>
            <p>Stakear REGEN para generar rendimiento pasivo</p>
          </div>
          <div className="utility-item">
            <span>🎨</span>
            <p>Mintear criaturas como NFTs unicos en blockchain</p>
          </div>
        </div>
      </div>

      <button className="btn-secondary" onClick={onBack} style={{ marginTop: 16 }}>
        Volver
      </button>
    </div>
  );
}
