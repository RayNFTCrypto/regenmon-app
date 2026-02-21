export const regenmonTypes = {
  fuego: {
    name: "Fuego",
    emoji: "🔥",
    sprite: "/sprites/regenmon/fuego.jpeg",
    color: "#FF4500",
    colorSecondary: "#FF8C00",
    glow: "#FF6B35",
    symbols: ["🔥", "✦", "◆"],
    stats: { hp: 80, atk: 90, def: 60, spd: 85 },
    description: "Feroz y veloz. Su poder de ataque es devastador.",
  },
  hielo: {
    name: "Hielo",
    emoji: "❄️",
    sprite: "/sprites/regenmon/hielo.png",
    color: "#00BFFF",
    colorSecondary: "#40E0D0",
    glow: "#0099CC",
    symbols: ["❄️", "◇", "○"],
    stats: { hp: 90, atk: 70, def: 85, spd: 70 },
    description: "Resistente y equilibrado. Su defensa es sólida.",
  },
  sombra: {
    name: "Sombra",
    emoji: "🔮",
    sprite: "/sprites/regenmon/sombra.png",
    color: "#9B30FF",
    colorSecondary: "#B388FF",
    glow: "#7B68EE",
    symbols: ["✨", "◈", "❖"],
    stats: { hp: 85, atk: 80, def: 75, spd: 80 },
    description: "Misterioso y poderoso. Domina las sombras.",
  },
};

export const statLabels = {
  hp: "HP",
  atk: "ATK",
  def: "DEF",
  spd: "SPD",
};
