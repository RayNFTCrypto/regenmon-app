export const MISSIONS = [
  {
    id: "first_battle",
    name: "Primera Victoria",
    description: "Gana tu primera batalla",
    emoji: "⚔️",
    reward: 100,
    check: "battles_won",
    target: 1,
  },
  {
    id: "mint_nft",
    name: "Coleccionista Digital",
    description: "Mintea tu criatura como NFT",
    emoji: "🎨",
    reward: 200,
    check: "nft_minted",
    target: 1,
  },
  {
    id: "three_battles",
    name: "Guerrero",
    description: "Gana 3 batallas",
    emoji: "🏆",
    reward: 300,
    check: "battles_won",
    target: 3,
  },
  {
    id: "care_master",
    name: "Cuidador Experto",
    description: "Mantén todos los stats arriba de 80%",
    emoji: "💚",
    reward: 150,
    check: "care_stats",
    target: 80,
  },
  {
    id: "marketplace_buyer",
    name: "Comprador",
    description: "Compra un item en el Marketplace",
    emoji: "🛒",
    reward: 50,
    check: "marketplace_purchase",
    target: 1,
  },
];

export const DAILY_REWARD = 50;
export const CARE_REWARD_BASE = 10;
export const CARE_CLAIM_HOURS = 4;
export const STAKE_DAILY_RATE = 0.05; // 5% daily for demo
