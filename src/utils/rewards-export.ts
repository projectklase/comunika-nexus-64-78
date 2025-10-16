import { EnhancedKoinTransaction } from '@/types/admin-rewards';
import { KoinTransaction, RedemptionRequest } from '@/types/rewards';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Exporta transações administrativas para CSV
 */
export function exportAdminTransactionsToCSV(transactions: EnhancedKoinTransaction[]): void {
  const headers = [
    'Data',
    'Hora',
    'Aluno',
    'Tipo',
    'Valor',
    'Saldo Anterior',
    'Saldo Posterior',
    'Origem',
    'Descrição',
    'Responsável',
    'Status'
  ];

  const rows = transactions.map(tx => [
    format(new Date(tx.timestamp), 'dd/MM/yyyy', { locale: ptBR }),
    format(new Date(tx.timestamp), 'HH:mm:ss', { locale: ptBR }),
    tx.studentName,
    getTransactionTypeLabel(tx.type),
    tx.type === 'SPEND' || tx.type === 'REDEMPTION' ? `-${tx.amount}` : `+${tx.amount}`,
    tx.balanceBefore?.toString() || '',
    tx.balanceAfter?.toString() || '',
    tx.humanizedSource.name,
    tx.description,
    tx.responsibleAdminName || '',
    tx.redemptionStatus || ''
  ]);

  downloadCSV('historico-koins-admin', headers, rows);
}

/**
 * Exporta transações de aluno para CSV
 */
export function exportStudentTransactionsToCSV(
  transactions: KoinTransaction[], 
  studentName: string
): void {
  const headers = [
    'Data',
    'Hora',
    'Tipo',
    'Valor',
    'Saldo Anterior',
    'Saldo Posterior',
    'Descrição',
    'Status'
  ];

  const rows = transactions.map(tx => [
    format(new Date(tx.timestamp), 'dd/MM/yyyy', { locale: ptBR }),
    format(new Date(tx.timestamp), 'HH:mm:ss', { locale: ptBR }),
    getTransactionTypeLabel(tx.type),
    tx.type === 'SPEND' || tx.type === 'REDEMPTION' ? `-${tx.amount}` : `+${tx.amount}`,
    tx.balanceBefore?.toString() || '',
    tx.balanceAfter?.toString() || '',
    tx.description,
    tx.redemptionStatus || ''
  ]);

  const filename = `historico-koins-${studentName.toLowerCase().replace(/\s+/g, '-')}`;
  downloadCSV(filename, headers, rows);
}

/**
 * Exporta resgates para CSV
 */
export function exportRedemptionsToCSV(redemptions: RedemptionRequest[]): void {
  const headers = [
    'Data Solicitação',
    'Aluno',
    'Item',
    'Valor (Koins)',
    'Status',
    'Data Processamento',
    'Processado Por',
    'Motivo Rejeição'
  ];

  const rows = redemptions.map(r => [
    format(new Date(r.requestedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
    '', // Nome do aluno será preenchido pela função chamadora
    r.itemName,
    r.koinAmount.toString(),
    getRedemptionStatusLabel(r.status),
    r.processedAt ? format(new Date(r.processedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
    '', // Nome do responsável será preenchido pela função chamadora
    r.rejectionReason || ''
  ]);

  downloadCSV('resgates', headers, rows);
}

/**
 * Função auxiliar para baixar CSV
 */
function downloadCSV(filename: string, headers: string[], rows: string[][]): void {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    )
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'EARN': 'Ganho',
    'SPEND': 'Gasto',
    'BONUS': 'Bonificação',
    'REFUND': 'Estorno',
    'REDEMPTION': 'Resgate'
  };
  return labels[type] || type;
}

function getRedemptionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'PENDING': 'Pendente',
    'APPROVED': 'Aprovado',
    'REJECTED': 'Recusado'
  };
  return labels[status] || status;
}
