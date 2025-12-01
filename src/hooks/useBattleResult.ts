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

  const isVictory = battle.winner_id === userId;

  // For Direct Duel, estimate rounds and cards based on HP
  const gameState = battle.game_state as any;
  const roundsWon = isVictory ? 1 : 0;
  const roundsLost = isVictory ? 0 : 1;

  // Estimate cards played from battle log
  const cardsPlayed = gameState?.battle_log?.filter((log: any) => 
    log.action === 'PLAY_MONSTER' || log.action === 'PLAY_TRAP'
  ).length || 0;

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
