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
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
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
    return `Revisar entrega`;
  };

  const getDescription = () => {
    if (mode === 'multiple') {
      return `Você está prestes a revisar ${selectedCount} entregas da atividade "${activityTitle}".`;
    }
    return `Revisão da entrega de ${studentName} para "${activityTitle}".`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-24px)] max-w-[500px] mx-3 sm:mx-auto p-4 sm:p-6 rounded-2xl bg-background/95 backdrop-blur-xl border border-white/10">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg sm:text-xl font-semibold">{getTitle()}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        {!action ? (
          <div className="space-y-3 sm:space-y-4 py-2">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Escolha uma ação para {mode === 'multiple' ? 'as entregas selecionadas' : 'esta entrega'}:
            </p>
            
            <div className="grid gap-3">
              {/* Botão Aprovar - Glassmorphism Verde */}
              <button
                type="button"
                onClick={() => handleAction('APROVADA')}
                className="w-full h-auto p-4 sm:p-5 rounded-xl 
                  bg-emerald-500/10 backdrop-blur-md
                  border border-emerald-500/40 
                  hover:bg-emerald-500/20 hover:border-emerald-400/60
                  active:scale-[0.98]
                  transition-all duration-300 
                  flex items-center gap-3 sm:gap-4
                  group"
              >
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full 
                  bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 
                  flex items-center justify-center 
                  border border-emerald-500/30
                  group-hover:from-emerald-500/40 group-hover:to-emerald-600/30
                  transition-all duration-300">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-semibold text-emerald-300 text-base sm:text-lg">
                    Aprovar
                  </div>
                  <div className="text-xs sm:text-sm text-emerald-400/70 leading-snug">
                    Marcar como aprovada
                  </div>
                </div>
              </button>

              {/* Botão Devolver - Glassmorphism Vermelho */}
              <button
                type="button"
                onClick={() => handleAction('DEVOLVIDA')}
                className="w-full h-auto p-4 sm:p-5 rounded-xl 
                  bg-red-500/10 backdrop-blur-md
                  border border-red-500/40 
                  hover:bg-red-500/20 hover:border-red-400/60
                  active:scale-[0.98]
                  transition-all duration-300 
                  flex items-center gap-3 sm:gap-4
                  group"
              >
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full 
                  bg-gradient-to-br from-red-500/30 to-red-600/20 
                  flex items-center justify-center 
                  border border-red-500/30
                  group-hover:from-red-500/40 group-hover:to-red-600/30
                  transition-all duration-300">
                  <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-semibold text-red-300 text-base sm:text-lg">
                    Devolver
                  </div>
                  <div className="text-xs sm:text-sm text-red-400/70 leading-snug">
                    Solicitar correção ou reenvio
                  </div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Status Card */}
            <div className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl backdrop-blur-md border ${
              action === 'APROVADA' 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                action === 'APROVADA'
                  ? 'bg-emerald-500/20 border border-emerald-500/30'
                  : 'bg-red-500/20 border border-red-500/30'
              }`}>
                {action === 'APROVADA' ? (
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                )}
              </div>
              <span className={`font-medium text-sm sm:text-base ${
                action === 'APROVADA' ? 'text-emerald-300' : 'text-red-300'
              }`}>
                {action === 'APROVADA' ? 'Aprovando' : 'Devolvendo'} {mode === 'multiple' ? 'as entregas' : 'a entrega'}
              </span>
            </div>

            {/* Textarea */}
            <div className="space-y-2">
              <Label htmlFor="reviewNote" className="text-sm font-medium">
                {action === 'APROVADA' ? 'Comentário (opcional)' : 'Motivo da devolução'}
                {action === 'DEVOLVIDA' && <span className="text-red-400 ml-1">*</span>}
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
                className="min-h-[100px] sm:min-h-[120px] bg-background/50 backdrop-blur-sm border-white/10 
                  focus:border-white/20 resize-none text-sm sm:text-base"
              />
              {action === 'DEVOLVIDA' && !reviewNote.trim() && (
                <p className="text-xs sm:text-sm text-red-400">
                  É obrigatório informar o motivo da devolução
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
          {action && (
            <Button 
              type="button"
              variant="ghost" 
              onClick={() => setAction(null)} 
              disabled={isLoading}
              className="w-full sm:w-auto bg-white/5 backdrop-blur-sm border border-white/10 
                hover:bg-white/10 hover:border-white/20 
                px-4 py-2.5 text-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          )}
          <Button 
            type="button"
            variant="ghost" 
            onClick={handleClose} 
            disabled={isLoading}
            className="w-full sm:w-auto bg-white/5 backdrop-blur-sm border border-white/10 
              hover:bg-white/10 hover:border-white/20 
              px-4 py-2.5 text-sm"
          >
            Cancelar
          </Button>
          {action && (
            <Button 
              type="button"
              onClick={handleSubmit} 
              disabled={isLoading || (action === 'DEVOLVIDA' && !reviewNote.trim())}
              className={`w-full sm:w-auto backdrop-blur-sm px-4 sm:px-6 py-2.5 text-sm font-medium
                transition-all duration-300 ${
                action === 'APROVADA' 
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-400/60' 
                  : 'bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 hover:border-red-400/60'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? 'Processando...' : action === 'APROVADA' ? 'Confirmar Aprovação' : 'Confirmar Devolução'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
