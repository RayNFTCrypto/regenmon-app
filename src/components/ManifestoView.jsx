export function ManifestoView({ onBack }) {
  return (
    <div className="manifesto-view fade-in">
      <h2 className="manifesto-title">Manifiesto</h2>

      {/* Lore */}
      <section className="manifesto-section">
        <div className="manifesto-icon">🌌</div>
        <h3>El Mundo de Aetheria</h3>
        <p>
          En los confines del plano digital, existe un reino olvidado llamado
          <strong> Aetheria</strong> — un mundo donde la energia primordial
          fluye a traves de cristales vivos y las criaturas nacen de la
          convergencia entre codigo y naturaleza.
        </p>
        <p>
          Los <strong>Regenmon</strong> son seres ancestrales que habitan este
          plano. Cada uno nace con una esencia unica — fuego, hielo o sombra —
          moldeada por las fuerzas elementales de Aetheria. Durante eones
          permanecieron dormidos, esperando a que guardianes dignos los
          despertaran.
        </p>
        <p>
          Cuando los primeros exploradores digitales cruzaron el umbral hacia
          Aetheria, los Regenmon despertaron. Ahora buscan guardianes que los
          cuiden, los entrenen y luchen junto a ellos para restaurar el
          equilibrio del reino.
        </p>
      </section>

      {/* Las Criaturas */}
      <section className="manifesto-section">
        <div className="manifesto-icon">🐉</div>
        <h3>Las Criaturas</h3>
        <div className="manifesto-types">
          <div className="type-card" style={{ "--type-color": "#FF6B35" }}>
            <span className="type-emoji">🔥</span>
            <strong>Fuego</strong>
            <p>Feroces y apasionados. Dominan el ataque con llamaradas devastadoras.</p>
          </div>
          <div className="type-card" style={{ "--type-color": "#4FC3F7" }}>
            <span className="type-emoji">❄️</span>
            <strong>Hielo</strong>
            <p>Serenos y resistentes. Su defensa cristalina los hace casi invencibles.</p>
          </div>
          <div className="type-card" style={{ "--type-color": "#CE93D8" }}>
            <span className="type-emoji">🌑</span>
            <strong>Sombra</strong>
            <p>Agiles y misteriosos. Se mueven entre dimensiones con velocidad letal.</p>
          </div>
        </div>
      </section>

      {/* Misión */}
      <section className="manifesto-section">
        <div className="manifesto-icon">🌱</div>
        <h3>Nuestra Mision</h3>
        <p>
          Aetheria nace de la vision de que los mundos virtuales pueden ser
          espacios de <strong>regeneracion</strong> — no solo de extraccion.
          Cada interaccion con tu Regenmon genera valor real a traves del
          token REGEN.
        </p>
        <div className="manifesto-pillars">
          <div className="pillar">
            <span>🎮</span>
            <strong>Play & Earn</strong>
            <p>Juega, cuida y batalla. Cada accion tiene recompensa.</p>
          </div>
          <div className="pillar">
            <span>🔗</span>
            <strong>True Ownership</strong>
            <p>Tus criaturas son NFTs. Tu las posees en blockchain.</p>
          </div>
          <div className="pillar">
            <span>🤝</span>
            <strong>Comunidad</strong>
            <p>Construido por y para la comunidad Web3.</p>
          </div>
          <div className="pillar">
            <span>♻️</span>
            <strong>Regeneracion</strong>
            <p>Un ecosistema que crece y se renueva constantemente.</p>
          </div>
        </div>
      </section>

      {/* Quote */}
      <div className="manifesto-quote">
        <p>&ldquo;En Aetheria, no eres solo un jugador — eres un guardian.&rdquo;</p>
      </div>

      <button className="btn-secondary" onClick={onBack} style={{ marginTop: 16 }}>
        Volver
      </button>
    </div>
  );
}
