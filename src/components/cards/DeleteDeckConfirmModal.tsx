import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, Layers } from 'lucide-react';

interface DeleteDeckConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckName: string;
  cardCount: number;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteDeckConfirmModal({
  open,
  onOpenChange,
  deckName,
  cardCount,
  onConfirm,
  loading = false
}: DeleteDeckConfirmModalProps) {
  const [confirmationText, setConfirmationText] = useState('');

  // Reset input when modal opens/closes
  useEffect(() => {
    if (!open) {
      setConfirmationText('');
    }
  }, [open]);

  const isConfirmationValid = confirmationText.trim().toLowerCase() === deckName.trim().toLowerCase();

  const handleConfirm = () => {
    if (isConfirmationValid) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    setConfirmationText('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <DialogContent 
        className="w-[95vw] max-w-[500px] p-4 sm:p-6 border-destructive/50 bg-background/95 backdrop-blur-md"
        onPointerDownOutside={loading ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={loading ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2 text-xl">
            <Trash2 className="h-6 w-6" />
            Excluir Deck Permanentemente
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Esta ação é <span className="font-bold text-destructive">IRREVERSÍVEL</span>. 
            O deck será excluído permanentemente do banco de dados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informações do Deck */}
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-destructive font-semibold">
              <AlertTriangle className="h-5 w-5" />
              <span>DECK A SER EXCLUÍDO:</span>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-md bg-background/50 border border-border/50">
              <div className="flex items-center gap-3">
                <Layers className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold text-lg">{deckName}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {cardCount} {cardCount === 1 ? 'carta' : 'cartas'}
              </div>
            </div>

            <div className="pt-2 text-sm text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 rounded-md p-3 border border-amber-500/20">
              ⚠️ Suas cartas NÃO serão perdidas. Apenas a configuração do deck será removida.
            </div>
          </div>

          {/* Campo de Confirmação */}
          <div className="space-y-3 pt-2">
            <Label htmlFor="deck-confirmation" className="text-base font-semibold">
              Para confirmar, digite o nome do deck:
            </Label>
            <Input
              id="deck-confirmation"
              type="text"
              placeholder={`Digite: "${deckName}"`}
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              disabled={loading}
              className={`${
                confirmationText && !isConfirmationValid
                  ? 'border-destructive focus-visible:ring-destructive'
                  : isConfirmationValid
                  ? 'border-green-500 focus-visible:ring-green-500'
                  : ''
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isConfirmationValid && !loading) {
                  handleConfirm();
                }
              }}
            />
            {confirmationText && !isConfirmationValid && (
              <p className="text-sm text-destructive">
                O nome digitado não corresponde. Verifique a ortografia.
              </p>
            )}
            {isConfirmationValid && (
              <p className="text-sm text-green-500 flex items-center gap-1">
                ✓ Nome correto. Você pode confirmar a exclusão.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-row sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="w-full sm:w-auto h-11 sm:h-10 order-2 sm:order-1"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmationValid || loading}
            className="w-full sm:w-auto h-11 sm:h-10 order-1 sm:order-2"
          >
            {loading ? 'Excluindo...' : '🗑️ Excluir Permanentemente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
