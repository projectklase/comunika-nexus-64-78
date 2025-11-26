import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, KeyRound, Copy, RefreshCw, Mail, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { passwordResetStore } from '@/stores/password-reset-store';
import { PasswordResetRequest } from '@/types/password-reset-request';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProcessPasswordRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: PasswordResetRequest | null;
}

export function ProcessPasswordRequestModal({
  open,
  onOpenChange,
  request,
}: ProcessPasswordRequestModalProps) {
  const { user, updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [requiresChange, setRequiresChange] = useState(true);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setNewPassword(password);
    toast.success('Senha gerada aleatoriamente');
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(newPassword);
    toast.success('Senha copiada para área de transferência');
  };

  const handleProcess = async () => {
    if (!request || !user) return;

    if (!newPassword || newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setProcessing(true);
    try {
      // Atualizar senha do usuário (implementação via updatePassword do AuthContext)
      const success = await updatePassword(request.requesterId, newPassword, requiresChange);

      if (success) {
        // Marcar solicitação como concluída
        await passwordResetStore.complete(request.id, {
          processedBy: user.id,
          requiresChangeOnNextLogin: requiresChange,
          notes: notes.trim() || undefined,
        });

        toast.success('Senha redefinida com sucesso!', {
          description: requiresChange 
            ? 'O usuário deverá alterar a senha no próximo login' 
            : 'Nova senha configurada',
        });

        handleClose();
      } else {
        toast.error('Falha ao redefinir senha', {
          description: 'Verifique as permissões e tente novamente',
        });
      }
    } catch (error: any) {
      console.error('Erro ao processar solicitação:', error);
      toast.error('Erro ao processar solicitação', {
        description: error.message || 'Tente novamente mais tarde',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    if (!request) return;
    
    passwordResetStore.cancel(request.id, 'Cancelado pelo administrador');
    toast.info('Solicitação cancelada');
    handleClose();
  };

  const handleClose = () => {
    setNewPassword('');
    setRequiresChange(true);
    setNotes('');
    onOpenChange(false);
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Processar Solicitação de Redefinição
          </DialogTitle>
          <DialogDescription>
            Configure a nova senha para o usuário solicitante
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info do Solicitante */}
          <Card className="glass-card border-primary/20">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{request.requesterName}</span>
                </div>
                <Badge variant="outline">{request.requesterRole}</Badge>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span>{request.email}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Solicitado em {format(new Date(request.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>

              {request.reason && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-sm font-medium mb-1">Motivo:</p>
                  <p className="text-sm text-muted-foreground italic">{request.reason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Nova Senha */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <div className="flex gap-2">
              <Input
                id="newPassword"
                type="text"
                placeholder="Digite ou gere uma senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={generatePassword}
                title="Gerar senha aleatória"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyPassword}
                disabled={!newPassword}
                title="Copiar senha"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Mínimo 6 caracteres. Use o botão de geração para criar senha forte.
            </p>
          </div>

          {/* Opções */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50">
            <div className="space-y-0.5">
              <Label htmlFor="requiresChange" className="text-sm font-medium">
                Exigir troca no próximo login
              </Label>
              <p className="text-xs text-muted-foreground">
                Usuário será obrigado a definir nova senha ao fazer login
              </p>
            </div>
            <Switch
              id="requiresChange"
              checked={requiresChange}
              onCheckedChange={setRequiresChange}
            />
          </div>

          {/* Placeholder: Enviar por Email (Futuro Resend) */}
          <div className="p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Envio automático por email será implementado com Resend em breve</span>
            </div>
          </div>

          {/* Notas Internas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas Internas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações sobre esta redefinição..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={processing}
          >
            Cancelar Solicitação
          </Button>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={processing}
            >
              Fechar
            </Button>
            <Button
              onClick={handleProcess}
              disabled={processing || !newPassword}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Redefinir Senha
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
