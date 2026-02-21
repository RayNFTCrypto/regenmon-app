// ═══════════════════════════════════════
// SISTEMA DE ESTADOS DE ÁNIMO
// ═══════════════════════════════════════

// Care stats iniciales al crear un Regenmon
export const INITIAL_CARE_STATS = {
  hunger: 70,     // 0 = muerto de hambre, 100 = lleno
  energy: 80,     // 0 = agotado, 100 = lleno de energía
  happiness: 75,  // 0 = deprimido, 100 = eufórico
  health: 90,     // 0 = enfermo, 100 = perfecto
};

// Moods con sus condiciones y caras
export const MOODS = {
  feliz: {
    id: "feliz",
    label: "Feliz",
    emoji: "😄",
    color: "#fbbf24",
    eyes: "◉‿◉",
    mouth: "◡",
    particleExtra: ["✨", "⭐"],
    // Se activa cuando happiness > 70 y no hay stats críticos
    check: (s) => s.happiness > 70 && s.hunger > 40 && s.health > 40,
    priority: 2,
  },
  tranquilo: {
    id: "tranquilo",
    label: "Tranquilo",
    emoji: "😌",
    color: "#60a5fa",
    eyes: "─̅  ─̅",
    mouth: "∿",
    particleExtra: ["✦"],
    // Estado default cuando todo está estable
    check: (s) => s.hunger > 30 && s.energy > 30 && s.health > 30,
    priority: 1,
  },
  hambriento: {
    id: "hambriento",
    label: "Hambriento",
    emoji: "🤤",
    color: "#f97316",
    eyes: "◔  ◔",
    mouth: "͡๏",
    particleExtra: ["🍔", "❓"],
    check: (s) => s.hunger <= 30,
    priority: 3,
  },
  cansado: {
    id: "cansado",
    label: "Cansado",
    emoji: "😴",
    color: "#a78bfa",
    eyes: "─̅  ─̅",
    mouth: "...",
    particleExtra: ["💤", "z"],
    check: (s) => s.energy <= 25,
    priority: 3,
  },
  triste: {
    id: "triste",
    label: "Triste",
    emoji: "😢",
    color: "#38bdf8",
    eyes: "•̣  •̣",
    mouth: "▿",
    particleExtra: ["💧"],
    check: (s) => s.happiness <= 25,
    priority: 4,
  },
  enojado: {
    id: "enojado",
    label: "Enojado",
    emoji: "😡",
    color: "#ef4444",
    eyes: "◉̀  ◉́",
    mouth: "╥",
    particleExtra: ["💢", "✖"],
    // Se enoja cuando tiene hambre Y está triste
    check: (s) => s.happiness <= 20 && s.hunger <= 25,
    priority: 5,
  },
  enfermo: {
    id: "enfermo",
    label: "Enfermo",
    emoji: "🤢",
    color: "#4ade80",
    eyes: "×  ×",
    mouth: "≈",
    particleExtra: ["🦠"],
    check: (s) => s.health <= 20,
    priority: 5,
  },
};

// Determina el mood actual basado en care stats
export function getCurrentMood(careStats) {
  const applicable = Object.values(MOODS)
    .filter((m) => m.check(careStats))
    .sort((a, b) => b.priority - a.priority);

  return applicable[0] || MOODS.tranquilo;
}

// Los stats bajan con el tiempo (por minuto)
export const DECAY_RATES = {
  hunger: -0.5,     // Pierde 0.5 hambre por minuto
  energy: -0.3,     // Pierde 0.3 energía por minuto
  happiness: -0.2,  // Pierde 0.2 felicidad por minuto
  health: -0.1,     // Pierde 0.1 salud por minuto
};

export const CARE_STAT_LABELS = {
  hunger: { label: "Hambre", icon: "🍔", color: "#f97316" },
  energy: { label: "Energía", icon: "⚡", color: "#fbbf24" },
  happiness: { label: "Felicidad", icon: "💜", color: "#a78bfa" },
  health: { label: "Salud", icon: "❤️", color: "#4ade80" },
};
