import { useAuth } from '@/contexts/AuthContext';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { KoinBalance } from './KoinBalance';

export function KoinBalanceHeader() {
  const { user } = useAuth();
  const { getKoinsEnabled } = useSchoolSettings();

  if (!user || user.role !== 'aluno') return null;

  // Check if Koins are enabled for current school
  const koinsEnabled = getKoinsEnabled();
  if (!koinsEnabled) return null;

  return (
    <KoinBalance
      availableBalance={user.koins || 0}
      blockedBalance={0}
      totalEarned={user.koins || 0}
      isCompact
    />
  );
}