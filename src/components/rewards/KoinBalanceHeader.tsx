import { useAuth } from '@/contexts/AuthContext';
import { useRewardsStore } from '@/stores/rewards-store';
import { KoinBalance } from './KoinBalance';

export function KoinBalanceHeader() {
  const { user } = useAuth();
  const { getStudentBalance } = useRewardsStore();

  if (!user || user.role !== 'aluno') return null;

  const balance = getStudentBalance(user.id);

  return (
    <KoinBalance
      availableBalance={balance.availableBalance}
      blockedBalance={balance.blockedBalance}
      totalEarned={balance.totalEarned}
      isCompact
    />
  );
}