import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RewardItem } from '@/types/rewards';
import { Coins, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RedemptionConfirmModalProps {
  item: RewardItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (item: RewardItem) => void;
  studentKoins: number;
  isProcessing?: boolean;
}

export function RedemptionConfirmModal({
  item,
  isOpen,
  onClose,
  onConfirm,
  studentKoins,
  isProcessing = false
}: RedemptionConfirmModalProps) {
  if (!item) return null;

  const remainingKoins = studentKoins - item.koinPrice;

  const handleConfirm = () => {
    onConfirm(item);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Confirmar Resgate
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item Summary */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <img
                  src={item.images[0] || '/placeholder.svg'}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{item.name}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span className="font-bold text-lg">{item.koinPrice}</span>
                    <span className="text-sm text-muted-foreground">Koins</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Balance Calculation */}
          <div className="bg-muted/10 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Seus Koins atuais:</span>
              <div className="flex items-center gap-1">
                <Coins className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">{studentKoins}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Preço do item:</span>
              <div className="flex items-center gap-1 text-destructive">
                <span>-</span>
                <Coins className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">{item.koinPrice}</span>
              </div>
            </div>
            
            <div className="border-t border-border/50 pt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Koins restantes:</span>
                <div className="flex items-center gap-1">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span className={cn(
                    "font-bold text-lg",
                    remainingKoins >= 0 ? "text-foreground" : "text-destructive"
                  )}>
                    {remainingKoins}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-warning font-medium mb-1">Importante:</p>
                <p className="text-muted-foreground">
                  Após confirmar, seus Koins serão reservados e o resgate ficará pendente de aprovação pela secretaria.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="bg-primary hover:bg-primary/90"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent mr-2" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirmar Resgate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}