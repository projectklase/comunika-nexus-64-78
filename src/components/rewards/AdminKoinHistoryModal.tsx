import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { EnhancedKoinTransaction } from '@/types/admin-rewards';
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Gift, 
  RotateCcw, 
  Calendar,
  User,
  Package,
  Briefcase,
  Activity,
  Settings,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdminKoinHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: EnhancedKoinTransaction[];
}

export function AdminKoinHistoryModal({
  isOpen,
  onClose,
  transactions
}: AdminKoinHistoryModalProps) {
  const getTransactionIcon = (type: EnhancedKoinTransaction['type']) => {
    switch (type) {
      case 'EARN':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'SPEND':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'BONUS':
        return <Gift className="h-4 w-4 text-purple-500" />;
      case 'REFUND':
        return <RotateCcw className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTransactionColor = (type: EnhancedKoinTransaction['type']) => {
    switch (type) {
      case 'EARN':
        return 'text-green-500';
      case 'SPEND':
        return 'text-red-500';
      case 'BONUS':
        return 'text-purple-500';
      case 'REFUND':
        return 'text-blue-500';
    }
  };

  const getTransactionLabel = (type: EnhancedKoinTransaction['type']) => {
    switch (type) {
      case 'EARN':
        return 'Ganhou';
      case 'SPEND':
        return 'Resgate';
      case 'BONUS':
        return 'Bônus';
      case 'REFUND':
        return 'Estorno';
    }
  };

  const getAmountPrefix = (type: EnhancedKoinTransaction['type']) => {
    return type === 'SPEND' ? '-' : '+';
  };

  const getSourceIcon = (sourceType: EnhancedKoinTransaction['humanizedSource']['type']) => {
    switch (sourceType) {
      case 'item':
        return <Package className="h-3 w-3" />;
      case 'event':
        return <Gift className="h-3 w-3" />;
      case 'task':
        return <Activity className="h-3 w-3" />;
      case 'system':
        return <Settings className="h-3 w-3" />;
    }
  };

  const getStatusBadge = (status?: EnhancedKoinTransaction['redemptionStatus']) => {
    if (!status) return null;
    
    const statusConfig = {
      PENDING: { label: 'Pendente', variant: 'default' as const, className: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' },
      APPROVED: { label: 'Aprovado', variant: 'default' as const, className: 'bg-green-500/10 text-green-700 border-green-200' },
      REJECTED: { label: 'Recusado', variant: 'destructive' as const, className: 'bg-red-500/10 text-red-700 border-red-200' }
    };
    
    const config = statusConfig[status];
    
    return (
      <Badge variant={config.variant} className={cn('text-xs', config.className)}>
        {config.label}
      </Badge>
    );
  };

  const handleExport = () => {
    // In a real implementation, this would generate a CSV/Excel file
    console.log('Exportando histórico...', transactions);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              Extrato Administrativo - Histórico de Koins
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="ml-2"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[600px] pr-4">
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <Coins className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhuma transação encontrada
              </h3>
              <p className="text-muted-foreground">
                O histórico de transações ainda está vazio
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="p-4 bg-card rounded-lg border border-border hover:shadow-md transition-all duration-200"
                >
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.type)}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs font-medium">
                            {getTransactionLabel(transaction.type)}
                          </Badge>
                          {getStatusBadge(transaction.redemptionStatus)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(transaction.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Amount */}
                    <div className={cn(
                      "flex items-center gap-1 font-bold text-lg",
                      getTransactionColor(transaction.type)
                    )}>
                      <span>{getAmountPrefix(transaction.type)}</span>
                      <Coins className="h-5 w-5 text-yellow-500" />
                      <span>{transaction.amount}</span>
                    </div>
                  </div>

                  {/* Student Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Aluno</p>
                        <p className="font-medium text-foreground">{transaction.studentName}</p>
                      </div>
                    </div>

                    {transaction.responsibleAdminName && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {transaction.type === 'BONUS' ? 'Distribuído por' : 
                             transaction.type === 'SPEND' ? 'Processado por' :
                             transaction.type === 'REFUND' ? 'Estornado por' : 'Responsável'}
                          </p>
                          <p className="font-medium text-foreground">{transaction.responsibleAdminName}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Transaction Details */}
                  <div className="space-y-2 p-3 bg-muted/20 rounded-md">
                    <div className="flex items-center gap-2">
                      {getSourceIcon(transaction.humanizedSource.type)}
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          {transaction.humanizedSource.type === 'item' ? 'Item' :
                           transaction.humanizedSource.type === 'event' ? 'Evento' :
                           transaction.humanizedSource.type === 'task' ? 'Atividade' : 'Sistema'}
                        </p>
                        <p className="font-medium text-foreground">{transaction.humanizedSource.name}</p>
                        {transaction.humanizedSource.details && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {transaction.humanizedSource.details}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {transaction.description && (
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-sm text-muted-foreground">Descrição</p>
                        <p className="text-sm text-foreground">{transaction.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}