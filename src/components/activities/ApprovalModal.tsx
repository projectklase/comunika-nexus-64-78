import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, XCircle } from 'lucide-react';
import { ReviewStatus } from '@/types/delivery';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reviewStatus: ReviewStatus, reviewNote?: string) => void;
  studentName: string;
  activityTitle: string;
  mode: 'single' | 'multiple';
  selectedCount?: number;
  isLoading?: boolean;
}

export function ApprovalModal({
  isOpen,
  onClose,
  onSubmit,
  studentName,
  activityTitle,
  mode,
  selectedCount = 1,
  isLoading = false
}: ApprovalModalProps) {
  const [reviewNote, setReviewNote] = useState('');
  const [action, setAction] = useState<ReviewStatus | null>(null);

  const handleSubmit = () => {
    if (!action) return;
    onSubmit(action, reviewNote.trim() || undefined);
    handleClose();
  };

  const handleClose = () => {
    setReviewNote('');
    setAction(null);
    onClose();
  };

  const handleAction = (reviewStatus: ReviewStatus) => {
    setAction(reviewStatus);
  };

  const getTitle = () => {
    if (mode === 'multiple') {
      return `Revisar ${selectedCount} entregas`;
    }
    return `Revisar entrega - ${studentName}`;
  };

  const getDescription = () => {
    if (mode === 'multiple') {
      return `Você está prestes a revisar ${selectedCount} entregas da atividade "${activityTitle}".`;
    }
    return `Revisão da entrega de ${studentName} para a atividade "${activityTitle}".`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        {!action ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Escolha uma ação para {mode === 'multiple' ? 'as entregas selecionadas' : 'esta entrega'}:
            </p>
            
            <div className="grid gap-3">
              <Button
                variant="outline"
                className="h-auto p-4 justify-start gap-3 border-success text-success hover:bg-success/10"
                onClick={() => handleAction('APROVADA')}
              >
                <CheckCircle className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Aprovar</div>
                  <div className="text-sm text-muted-foreground">
                    Marcar como aprovada
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 justify-start gap-3 border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => handleAction('DEVOLVIDA')}
              >
                <XCircle className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Devolver</div>
                  <div className="text-sm text-muted-foreground">
                    Solicitar correção ou reenvio
                  </div>
                </div>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              {action === 'APROVADA' ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="font-medium">
                {action === 'APROVADA' ? 'Aprovando' : 'Devolvendo'} {mode === 'multiple' ? 'as entregas' : 'a entrega'}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reviewNote">
                {action === 'APROVADA' ? 'Comentário (opcional)' : 'Motivo da devolução'}
                {action === 'DEVOLVIDA' && <span className="text-destructive"> *</span>}
              </Label>
              <Textarea 
                id="reviewNote"
                placeholder={
                  action === 'APROVADA' 
                    ? 'Deixe um comentário positivo...' 
                    : 'Explique o que precisa ser corrigido...'
                }
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="min-h-[100px]"
              />
              {action === 'DEVOLVIDA' && !reviewNote.trim() && (
                <p className="text-sm text-destructive">
                  É obrigatório informar o motivo da devolução
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          {action && (
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || (action === 'DEVOLVIDA' && !reviewNote.trim())}
              className={action === 'APROVADA' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}
            >
              {isLoading ? 'Processando...' : action === 'APROVADA' ? 'Confirmar Aprovação' : 'Confirmar Devolução'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}