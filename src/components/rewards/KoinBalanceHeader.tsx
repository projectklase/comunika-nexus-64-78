import { useAuth } from '@/contexts/AuthContext';
import { KoinBalance } from './KoinBalance';

export function KoinBalanceHeader() {
  const { user } = useAuth();

  if (!user || user.role !== 'aluno') return null;

  return (
    <KoinBalance
      availableBalance={user.koins || 0}
      blockedBalance={0}
      totalEarned={user.koins || 0}
      isCompact
    />
  );
}