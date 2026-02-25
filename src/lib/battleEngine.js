/**
 * Battle damage calculation.
 * baseDamage = (move.power * (attacker.atk / defender.def)) * randomFactor
 * randomFactor = 0.85 to 1.15
 */
export function calculateDamage(move, attackerStats, defenderStats, defBoost = 1) {
  // Accuracy check
  const roll = Math.random() * 100;
  if (roll > move.accuracy) {
    return { damage: 0, missed: true, defending: false };
  }

  if (move.type === "defend") {
    return { damage: 0, missed: false, defending: true, defBoost: move.defBoost };
  }

  const effectiveDef = defenderStats.def * defBoost;
  const ratio = attackerStats.atk / effectiveDef;
  const randomFactor = 0.85 + Math.random() * 0.3;
  const damage = Math.round(move.power * ratio * randomFactor);

  return { damage: Math.max(1, damage), missed: false, defending: false };
}

/**
 * Determine who goes first based on SPD.
 * Returns 1 if player1 goes first, 2 if player2.
 */
export function determineTurnOrder(stats1, stats2) {
  if (stats1.spd !== stats2.spd) {
    return stats1.spd > stats2.spd ? 1 : 2;
  }
  return Math.random() > 0.5 ? 1 : 2;
}

export const BATTLE_REWARD_WINNER = 100;
export const BATTLE_REWARD_LOSER = 25;
