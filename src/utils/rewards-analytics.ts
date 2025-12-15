import { KoinTransaction } from '@/types/rewards';
import { startOfMonth, endOfMonth, eachMonthOfInterval, format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface MonthlyDistribution {
  month: string;
  earned: number;
  spent: number;
  net: number;
}

export interface ItemStatistics {
  itemName: string;
  redemptionCount: number;
  totalKoins: number;
}

export interface ApprovalRates {
  approved: number;
  rejected: number;
  pending: number;
  approvalRate: number;
}

/**
 * Calcula distribuição mensal de Koins
 */
export function calculateMonthlyDistribution(
  transactions: KoinTransaction[],
  monthsBack: number = 6
): MonthlyDistribution[] {
  const now = new Date();
  const startDate = subMonths(now, monthsBack - 1);
  const months = eachMonthOfInterval({ start: startOfMonth(startDate), end: endOfMonth(now) });

  return months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const monthTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.timestamp);
      return txDate >= monthStart && txDate <= monthEnd;
    });

    const earned = monthTransactions
      .filter(tx => tx.type === 'EARN' || tx.type === 'BONUS' || tx.type === 'EARN_CHALLENGE')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const spent = monthTransactions
      .filter(tx => tx.type === 'SPEND' || tx.type === 'REDEMPTION')
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return {
      month: format(month, 'MMM/yy', { locale: ptBR }),
      earned,
      spent,
      net: earned - spent
    };
  });
}

/**
 * Calcula estatísticas dos itens mais resgatados
 */
export function calculateTopItems(
  transactions: KoinTransaction[],
  limit: number = 5
): ItemStatistics[] {
  const itemMap = new Map<string, ItemStatistics>();

  transactions
    .filter(tx => (tx.type === 'SPEND' || tx.type === 'REDEMPTION') && tx.itemName)
    .forEach(tx => {
      const itemName = tx.itemName!;
      const existing = itemMap.get(itemName);
      
      if (existing) {
        existing.redemptionCount += 1;
        existing.totalKoins += Math.abs(tx.amount);
      } else {
        itemMap.set(itemName, {
          itemName,
          redemptionCount: 1,
          totalKoins: Math.abs(tx.amount)
        });
      }
    });

  return Array.from(itemMap.values())
    .sort((a, b) => b.redemptionCount - a.redemptionCount)
    .slice(0, limit);
}

/**
 * Calcula taxas de aprovação/rejeição
 */
export function calculateApprovalRates(transactions: KoinTransaction[]): ApprovalRates {
  const redemptions = transactions.filter(
    tx => tx.type === 'REDEMPTION' || tx.type === 'SPEND'
  );

  const approved = redemptions.filter(
    tx => tx.redemptionStatus === 'APPROVED'
  ).length;

  const rejected = redemptions.filter(
    tx => tx.redemptionStatus === 'REJECTED'
  ).length;

  const pending = redemptions.filter(
    tx => tx.redemptionStatus === 'PENDING'
  ).length;

  const total = approved + rejected;
  const approvalRate = total > 0 ? (approved / total) * 100 : 0;

  return {
    approved,
    rejected,
    pending,
    approvalRate
  };
}

/**
 * Calcula total de Koins em circulação vs distribuídos
 */
export function calculateKoinCirculation(transactions: KoinTransaction[]): {
  totalDistributed: number;
  totalSpent: number;
  inCirculation: number;
} {
  const totalDistributed = transactions
    .filter(tx => tx.type === 'EARN' || tx.type === 'BONUS' || tx.type === 'EARN_CHALLENGE')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalSpent = transactions
    .filter(tx => tx.type === 'SPEND' || tx.type === 'REDEMPTION')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  return {
    totalDistributed,
    totalSpent,
    inCirculation: totalDistributed - totalSpent
  };
}
