import { useState, useEffect, useRef } from "react";
import { MOODS } from "../data/moods";

/* ═══ Sprite Base — Imagen real de Nano Banana Pro ═══ */
const SpriteBase = ({ type, mood, size = 120 }) => {
  const moodData = mood ? MOODS[mood] : null;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        position: "relative",
        transition: "all 0.5s ease",
      }}
    >
      {/* Imagen del Regenmon */}
      <img
        src={type.sprite}
        alt={type.name}
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: "50%",
        }}
      />

      {/* Overlay de mood (tinte sutil) */}
      {moodData && moodData.id !== "feliz" && moodData.id !== "tranquilo" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `${moodData.color}18`,
            mixBlendMode: "overlay",
            transition: "all 0.5s ease",
          }}
        />
      )}

      {/* Mood emoji indicator */}
      {moodData && (
        <div
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            fontSize: size * 0.18,
            animation: "floating 2s ease-in-out infinite",
            filter: `drop-shadow(0 0 4px ${moodData.color})`,
          }}
        >
          {moodData.emoji}
        </div>
      )}
    </div>
  );
};

/* ═══ Partículas ═══ */
const Particles = ({ color, symbols, mood }) => {
  const [particles, setParticles] = useState([]);
  const moodData = mood ? MOODS[mood] : null;
  const allSymbols = moodData
    ? [...symbols, ...(moodData.particleExtra || [])]
    : symbols;

  useEffect(() => {
    const iv = setInterval(() => {
      setParticles((prev) => {
        const now = Date.now();
        const filtered = prev.filter((p) => now - p.born < 2500);
        if (filtered.length < 12) {
          filtered.push({
            id: now + Math.random(),
            x: 35 + Math.random() * 30,
            y: 70 + Math.random() * 20,
            born: now,
            dx: (Math.random() - 0.5) * 50,
            dy: 1 + Math.random() * 2,
            size: 6 + Math.random() * 10,
            char: allSymbols[Math.floor(Math.random() * allSymbols.length)],
          });
        }
        return filtered;
      });
    }, 150);
    return () => clearInterval(iv);
  }, [allSymbols.join("")]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {particles.map((p) => {
        const age = (Date.now() - p.born) / 2500;
        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.x + p.dx * age}%`,
              bottom: `${p.y - 50 * age * p.dy}%`,
              fontSize: p.size,
              color,
              opacity: (1 - age) * 0.7,
              filter: `blur(${age * 2}px)`,
              transform: `rotate(${age * 90}deg) scale(${1 - age * 0.5})`,
              transition: "all 0.15s linear",
            }}
          >
            {p.char}
          </div>
        );
      })}
    </div>
  );
};

/* ═══ Campo de energía (Canvas) ═══ */
const EnergyField = ({ color, width = 220, height = 220 }) => {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = width * 2;
    canvas.height = height * 2;

    let animId;
    const draw = () => {
      frameRef.current++;
      const t = frameRef.current * 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      for (let i = 0; i < 5; i++) {
        const angle = t + (i * Math.PI * 2) / 5;
        const r = 80 + Math.sin(t * 2 + i) * 20;
        const arcLen = 0.4 + Math.sin(t + i * 0.7) * 0.2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, angle, angle + arcLen);
        const alpha = Math.floor((0.3 + 0.2 * Math.sin(t + i)) * 255)
          .toString(16)
          .padStart(2, "0");
        ctx.strokeStyle = color + alpha;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      for (let i = 0; i < 8; i++) {
        const angle = t * 0.8 + (i * Math.PI * 2) / 8;
        const r = 90 + Math.sin(t * 1.5 + i * 0.5) * 15;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        const alpha = Math.floor((0.3 + 0.3 * Math.sin(t * 2 + i)) * 255)
          .toString(16)
          .padStart(2, "0");
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = color + alpha;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [color, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
};

/* ═══ Componente principal: SpriteDisplay ═══ */
export function SpriteDisplay({ type, mood, size = 120 }) {
  return (
    <div
      className="sprite-stage"
      style={{
        width: size * 1.8,
        height: size * 1.8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        border: `1px solid ${type.color}10`,
        borderRadius: 16,
        background: `radial-gradient(circle, ${type.color}08 0%, transparent 70%)`,
      }}
    >
      <EnergyField color={type.color} width={size * 1.8} height={size * 1.8} />
      <Particles color={type.color} symbols={type.symbols} mood={mood} />

      {/* Sombra reactiva */}
      <div
        style={{
          position: "absolute",
          bottom: -10,
          left: "50%",
          transform: "translateX(-50%)",
          width: size * 0.6,
          height: 10,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${type.color}30 0%, transparent 70%)`,
          animation: "shadowPulse 3s ease-in-out infinite",
        }}
      />

      {/* Sprite con efectos apilados */}
      <div style={{ animation: "hueShift 4s ease-in-out infinite", "--hue-range": "10deg" }}>
        <div
          style={{
            animation: "glowPulse 2s ease-in-out infinite",
            "--glow-color": type.color,
            borderRadius: "50%",
          }}
        >
          <div style={{ animation: "floating 3s ease-in-out infinite" }}>
            <div style={{ animation: "breathing 3s ease-in-out infinite" }}>
              <SpriteBase type={type} mood={mood} size={size} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
