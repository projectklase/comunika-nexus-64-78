import { KoinTransaction, RedemptionRequest, BonusEvent, RewardItem } from '@/types/rewards';
import { EnhancedKoinTransaction } from '@/types/admin-rewards';

/**
 * Mock data for students and administrators
 * In a real implementation, this would come from a user store or API
 */
const mockUsers: Record<string, { name: string; role: string }> = {
  'student-1': { name: 'Ana Costa Silva', role: 'student' },
  'student-2': { name: 'Bruno Lima Santos', role: 'student' },
  'student-3': { name: 'Carolina Ferreira', role: 'student' },
  'student-4': { name: 'Daniel Oliveira', role: 'student' },
  'student-5': { name: 'Eduarda Pereira', role: 'student' },
  'admin-1': { name: 'Maria Silva', role: 'secretaria' },
  'admin-2': { name: 'João Rodrigues', role: 'secretaria' },
  'system': { name: 'Sistema', role: 'system' },
};

/**
 * Enhances raw KoinTransaction data with human-readable information for admin view
 */
export function enhanceTransactionsForAdmin(
  transactions: KoinTransaction[],
  redemptions: RedemptionRequest[],
  bonusEvents: BonusEvent[],
  rewardItems: RewardItem[]
): EnhancedKoinTransaction[] {
  return transactions.map(transaction => {
    const student = mockUsers[transaction.studentId] || { name: 'Aluno Desconhecido', role: 'student' };
    const responsibleAdmin = transaction.responsibleUserId 
      ? mockUsers[transaction.responsibleUserId] 
      : null;

    // Parse and humanize the source
    const humanizedSource = parseTransactionSource(
      transaction.source,
      redemptions,
      bonusEvents,
      rewardItems
    );

    // Get redemption status if applicable
    const redemptionStatus = getRedemptionStatus(transaction, redemptions);

    return {
      ...transaction,
      studentName: student.name,
      responsibleAdminName: responsibleAdmin?.name,
      humanizedSource,
      redemptionStatus,
    };
  });
}

/**
 * Parse transaction source and convert to human-readable format
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
      // In a real implementation, this would fetch from a tasks/activities store
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
 * Get redemption status for transaction
 */
function getRedemptionStatus(
  transaction: KoinTransaction,
  redemptions: RedemptionRequest[]
): EnhancedKoinTransaction['redemptionStatus'] {
  if (transaction.type !== 'SPEND' && transaction.type !== 'REFUND') {
    return undefined;
  }

  const redemptionId = transaction.source.split(':')[1];
  const redemption = redemptions.find(r => r.id === redemptionId);
  
  return redemption?.status;
}

/**
 * Get readable label for redemption status
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

/**
 * Generate mock student ID for demo purposes
 */
export function generateMockStudentId(): string {
  const studentIds = Object.keys(mockUsers).filter(id => mockUsers[id].role === 'student');
  return studentIds[Math.floor(Math.random() * studentIds.length)];
}

/**
 * Generate mock admin ID for demo purposes
 */
export function generateMockAdminId(): string {
  const adminIds = Object.keys(mockUsers).filter(id => mockUsers[id].role === 'secretaria');
  return adminIds[Math.floor(Math.random() * adminIds.length)];
}