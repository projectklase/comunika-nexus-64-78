import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { KoinTransaction } from '@/types/rewards';
import { Coins, TrendingUp, TrendingDown, Gift, RotateCcw, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface KoinHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: KoinTransaction[];
  studentName?: string;
}

export function KoinHistoryModal({
  isOpen,
  onClose,
  transactions,
  studentName = "Seu"
}: KoinHistoryModalProps) {
  const getTransactionIcon = (type: KoinTransaction['type']) => {
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

  const getTransactionColor = (type: KoinTransaction['type']) => {
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

  const getTransactionLabel = (type: KoinTransaction['type']) => {
    switch (type) {
      case 'EARN':
        return 'Ganhou';
      case 'SPEND':
        return 'Gastou';
      case 'BONUS':
        return 'Bônus';
      case 'REFUND':
        return 'Estorno';
    }
  };

  const getAmountPrefix = (type: KoinTransaction['type']) => {
    return type === 'SPEND' ? '-' : '+';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            {studentName} Histórico de Koins
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma transação encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center gap-4 p-4 bg-muted/5 rounded-lg border border-border/50 hover:bg-muted/10 transition-colors"
                >
                  {/* Icon and Type */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {getTransactionIcon(transaction.type)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {getTransactionLabel(transaction.type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(transaction.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground font-medium truncate">
                        {transaction.description}
                      </p>
                      {transaction.source && (
                        <p className="text-xs text-muted-foreground">
                          Origem: {transaction.source}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <div className={cn(
                      "flex items-center gap-1 font-bold",
                      getTransactionColor(transaction.type)
                    )}>
                      <span>{getAmountPrefix(transaction.type)}</span>
                      <Coins className="h-4 w-4 text-yellow-500" />
                      <span>{transaction.amount}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Saldo: {transaction.balanceAfter}
                    </div>
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