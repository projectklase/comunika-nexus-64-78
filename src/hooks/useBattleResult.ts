import { Battle } from './useBattle';

export interface BattleResult {
  isVictory: boolean;
  xpGained: number;
  stats: {
    roundsWon: number;
    roundsLost: number;
    cardsPlayed: number;
  };
  streakInfo: {
    currentStreak: number;
    bonusXP: number;
  };
}

export function useBattleResult(
  battle: Battle | null | undefined,
  userId: string | undefined
): BattleResult | null {
  if (!battle || !userId || battle.status !== 'FINISHED') {
    return null;
  }

  const isPlayer1 = battle.player1_id === userId;
  const isVictory = battle.winner_id === userId;

  const roundsWon = isPlayer1 ? battle.player1_rounds_won : battle.player2_rounds_won;
  const roundsLost = isPlayer1 ? battle.player2_rounds_won : battle.player1_rounds_won;

  // Calculate total cards played (approximate based on rounds)
  const cardsPlayed = battle.rounds_data?.reduce((total, round) => {
    const playerCards = isPlayer1 ? round.player1_cards : round.player2_cards;
    const lineCards = [
      playerCards.line1?.length || 0,
      playerCards.line2?.length || 0,
      playerCards.line3?.length || 0,
    ];
    return total + lineCards.reduce((sum, count) => sum + count, 0);
  }, 0) || 0;

  // Base XP
  const baseXP = isVictory ? 50 : 10;

  // Streak bonus (would require tracking consecutive wins - placeholder for now)
  // In a real implementation, you'd query the last N battles for this user
  const currentStreak = 0; // TODO: Implement streak tracking
  let bonusXP = 0;

  if (isVictory) {
    if (currentStreak >= 5) {
      bonusXP = 50;
    } else if (currentStreak >= 3) {
      bonusXP = 20;
    }
  }

  return {
    isVictory,
    xpGained: baseXP,
    stats: {
      roundsWon,
      roundsLost,
      cardsPlayed,
    },
    streakInfo: {
      currentStreak,
      bonusXP,
    },
  };
}
