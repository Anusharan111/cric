/**
 * Handles game scoring logic including combos and steals.
 */

export interface ScoreState {
  [teamOrPlayerId: string]: number;
}

/**
 * Calculates any streak/combo bonuses.
 * If a player/team gets consecutive correct answers, they get a +10 bonus starting from the 2nd correct guess.
 */
export function calculatePoints(
  basePoints: number,
  consecutiveCorrect: number
): { base: number; bonus: number; total: number } {
  if (consecutiveCorrect >= 2) {
    return {
      base: basePoints,
      bonus: 10,
      total: basePoints + 10,
    };
  }
  return {
    base: basePoints,
    bonus: 0,
    total: basePoints,
  };
}

/**
 * Updates the scores dictionary immutably.
 */
export function updateScore(
  scores: ScoreState,
  id: string,
  amount: number
): ScoreState {
  return {
    ...scores,
    [id]: (scores[id] || 0) + amount,
  };
}
