import { KoinTransaction, RedemptionRequest, BonusEvent, RewardItem } from '@/types/rewards';
import { EnhancedKoinTransaction } from '@/types/admin-rewards';
import { supabase } from '@/integrations/supabase/client';

/**
 * Busca dados reais de usuários do banco de dados
 */
async function fetchUserNames(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', userIds);

  if (error) {
    console.error('Error fetching user names:', error);
    return new Map();
  }

  return new Map(data?.map(u => [u.id, u.name]) || []);
}

/**
 * Enriquece transações com informações completas para visualização administrativa
 * Usa dados REAIS do banco de dados
 */
export async function enhanceTransactionsForAdmin(
  transactions: KoinTransaction[],
  redemptions: RedemptionRequest[],
  bonusEvents: BonusEvent[],
  rewardItems: RewardItem[]
): Promise<EnhancedKoinTransaction[]> {
  // Coletar todos os IDs únicos de usuários
  const userIds = new Set<string>();
  transactions.forEach(tx => {
    userIds.add(tx.studentId);
    if (tx.responsibleUserId) userIds.add(tx.responsibleUserId);
  });

  // Buscar nomes reais do banco
  const userNames = await fetchUserNames(Array.from(userIds));

  return transactions.map(transaction => {
    const studentName = userNames.get(transaction.studentId) || 'Aluno Desconhecido';
    const responsibleAdminName = transaction.responsibleUserId 
      ? userNames.get(transaction.responsibleUserId) 
      : undefined;

    // Parse e humanize a origem
    const humanizedSource = parseTransactionSource(
      transaction.source,
      redemptions,
      bonusEvents,
      rewardItems
    );

    // Obter status de resgate se aplicável
    const redemptionStatus = getRedemptionStatus(transaction, redemptions);

    return {
      ...transaction,
      studentName,
      responsibleAdminName,
      humanizedSource,
      redemptionStatus,
    };
  });
}

/**
 * Parse da origem da transação e conversão para formato legível
 */
function parseTransactionSource(
  source: string,
  redemptions: RedemptionRequest[],
  bonusEvents: BonusEvent[],
  rewardItems: RewardItem[]
): EnhancedKoinTransaction['humanizedSource'] {
  if (!source) {
    return { type: 'system', name: 'Sistema' };
  }

  const [sourceType, sourceId] = source.split(':');

  switch (sourceType) {
    case 'REDEMPTION': {
      const redemption = redemptions.find(r => r.id === sourceId);
      const item = redemption ? rewardItems.find(i => i.id === redemption.itemId) : null;
      
      return {
        type: 'item',
        name: item?.name || redemption?.itemName || 'Item Desconhecido',
        details: redemption?.status ? `Status: ${getRedemptionStatusLabel(redemption.status)}` : undefined
      };
    }
    
    case 'EVENT': {
      const event = bonusEvents.find(e => e.id === sourceId);
      return {
        type: 'event',
        name: event?.name || 'Evento Desconhecido',
        details: event?.description
      };
    }
    
    case 'TASK': {
      return {
        type: 'task',
        name: `Tarefa #${sourceId.substring(0, 8)}`,
        details: 'Atividade escolar concluída'
      };
    }
    
    default:
      return {
        type: 'system',
        name: 'Sistema',
        details: source
      };
  }
}

/**
 * Obter status de resgate para transação
 */
function getRedemptionStatus(
  transaction: KoinTransaction,
  redemptions: RedemptionRequest[]
): EnhancedKoinTransaction['redemptionStatus'] {
  if (transaction.type !== 'SPEND' && 
      transaction.type !== 'REFUND' && 
      transaction.type !== 'REDEMPTION') {
    return undefined;
  }

  const redemptionId = transaction.source.split(':')[1];
  const redemption = redemptions.find(r => r.id === redemptionId);
  
  return redemption?.status;
}

/**
 * Obter label legível para status de resgate
 */
function getRedemptionStatusLabel(status: RedemptionRequest['status']): string {
  switch (status) {
    case 'PENDING':
      return 'Pendente';
    case 'APPROVED':
      return 'Aprovado';
    case 'REJECTED':
      return 'Recusado';
    default:
      return 'Desconhecido';
  }
}
