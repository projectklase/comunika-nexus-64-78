import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, KeyRound, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { passwordResetStore } from '@/stores/password-reset-store';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PasswordResetRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasswordResetRequestModal({
  open,
  onOpenChange,
}: PasswordResetRequestModalProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;

    setSubmitting(true);
    try {
      await passwordResetStore.createRequest(
        user.email,
        user.id,
        user.name,
        user.role,
        reason.trim() || undefined
      );

      toast.success('Solicitação enviada com sucesso!', {
        description: 'Os administradores serão notificados e processarão sua solicitação em breve.',
      });

      handleClose();
    } catch (error: any) {
      console.error('Erro ao criar solicitação:', error);
      toast.error('Erro ao enviar solicitação', {
        description: error.message || 'Tente novamente mais tarde.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Solicitar Redefinição de Senha
          </DialogTitle>
          <DialogDescription>
            Envie uma solicitação aos administradores para redefinir sua senha
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="border-primary/20 bg-primary/5">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              <strong>Como funciona:</strong> Sua solicitação será enviada aos administradores da escola.
              Eles redefinirão sua senha e você receberá uma notificação com instruções.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Motivo (opcional)
            </Label>
            <Textarea
              id="reason"
              placeholder="Ex: Esqueci minha senha, Preciso atualizar credenciais..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Forneça um motivo para ajudar os administradores a processar sua solicitação
            </p>
          </div>

          {user && (
            <div className="rounded-lg border border-border/50 bg-card/50 p-3 space-y-1">
              <p className="text-sm font-medium">Dados da Solicitação</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Nome:</strong> {user.name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Função:</strong> {user.role === 'secretaria' ? 'Secretária' : 'Professor'}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <KeyRound className="mr-2 h-4 w-4" />
                Enviar Solicitação
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
