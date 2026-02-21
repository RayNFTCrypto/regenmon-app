// ═══════════════════════════════════════
// ITEMS DEL SISTEMA DE CUIDADO
// ═══════════════════════════════════════

export const ITEMS = {
  // ═══ COMIDA ═══
  baguette: {
    id: "baguette",
    name: "Baguette",
    sprite: "/sprites/items/baguette.png",
    category: "food",
    effects: { hunger: 30, energy: 10 },
    description: "Pan crujiente. Lo básico siempre funciona.",
    rarity: "common",
  },
  donut: {
    id: "donut",
    name: "Donut Cósmico",
    sprite: "/sprites/items/donut.png",
    category: "food",
    effects: { hunger: 20, happiness: 25, health: -5 },
    description: "Delicioso pero... la salud tiene un precio.",
    rarity: "common",
  },
  apple: {
    id: "apple",
    name: "Manzana Digital",
    sprite: "/sprites/items/apple-green.png",
    category: "food",
    effects: { hunger: 25, health: 15 },
    description: "Una manzana al día mantiene al debug lejos.",
    rarity: "common",
  },
  pizza: {
    id: "pizza",
    name: "Pizza Pixel",
    sprite: "/sprites/items/pizza.png",
    category: "food",
    effects: { hunger: 35, happiness: 15 },
    description: "Nada como una rebanada después de programar.",
    rarity: "common",
  },
  petfood: {
    id: "petfood",
    name: "Festín Premium",
    sprite: "/sprites/items/pet-food-bowl.png",
    category: "food",
    effects: { hunger: 50, energy: 20 },
    description: "Comida completa preparada con datos puros.",
    rarity: "epic",
  },
  soda: {
    id: "soda",
    name: "Voltage Cola",
    sprite: "/sprites/items/soda-can.png",
    category: "food",
    effects: { energy: 40, health: -10 },
    description: "Energía instantánea. Tu salud opina diferente.",
    rarity: "common",
  },

  // ═══ CURACIÓN ═══
  potion: {
    id: "potion",
    name: "Poción de Salud",
    sprite: "/sprites/items/potion-health.png",
    category: "heal",
    effects: { health: 40 },
    description: "Restaura la integridad del código vital.",
    rarity: "uncommon",
  },
  medkit: {
    id: "medkit",
    name: "Kit de Reparación",
    sprite: "/sprites/items/medkit.png",
    category: "heal",
    effects: { health: 70 },
    description: "Reparación total. Elimina bugs del sistema.",
    rarity: "rare",
  },
  spray: {
    id: "spray",
    name: "Nano Spray",
    sprite: "/sprites/items/spray-bottle.png",
    category: "heal",
    effects: { health: 15, happiness: 5 },
    description: "Mantenimiento básico de rutina.",
    rarity: "common",
  },

  // ═══ JUGAR ═══
  duck: {
    id: "duck",
    name: "Debug Duck",
    sprite: "/sprites/items/rubber-duck.png",
    category: "play",
    effects: { happiness: 35, energy: -10 },
    description: "Le cuentas tus problemas y todo mejora.",
    rarity: "uncommon",
  },
  headphones: {
    id: "headphones",
    name: "Headphones Cósmicos",
    sprite: "/sprites/items/headphones.png",
    category: "play",
    effects: { happiness: 25, energy: -5 },
    description: "Música de la Lattice. Expande la consciencia.",
    rarity: "rare",
  },
  gamepad: {
    id: "gamepad",
    name: "Gamepad Retro",
    sprite: "/sprites/items/gamepad.png",
    category: "play",
    effects: { happiness: 30, energy: -15 },
    description: "Sesión de gaming. Pura diversión pixelada.",
    rarity: "uncommon",
  },

  // ═══ DORMIR ═══
  clock: {
    id: "clock",
    name: "Reloj de Ciclos",
    sprite: "/sprites/items/alarm-clock.png",
    category: "sleep",
    effects: { energy: 60, happiness: -5 },
    description: "Programa un ciclo de restauración profunda.",
    rarity: "uncommon",
  },
  lantern: {
    id: "lantern",
    name: "Linterna Onírica",
    sprite: "/sprites/items/lantern.png",
    category: "sleep",
    effects: { energy: 30, happiness: 10 },
    description: "Luz suave que guía sueños pacíficos.",
    rarity: "uncommon",
  },
};

export const CATEGORIES = {
  food: { label: "Comida", icon: "🍔", color: "#f97316" },
  heal: { label: "Curación", icon: "💊", color: "#4ade80" },
  play: { label: "Jugar", icon: "🎮", color: "#60a5fa" },
  sleep: { label: "Dormir", icon: "😴", color: "#a78bfa" },
};

export const RARITY_COLORS = {
  common: "#9ca3af",
  uncommon: "#4ade80",
  rare: "#60a5fa",
  epic: "#a78bfa",
};
