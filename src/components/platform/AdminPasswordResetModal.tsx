import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Key, Mail, Lock } from 'lucide-react';

interface AdminPasswordResetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export function AdminPasswordResetModal({ open, onOpenChange, admin }: AdminPasswordResetModalProps) {
  const [method, setMethod] = useState<'email' | 'direct'>('email');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!admin) throw new Error('Admin not selected');

      if (method === 'direct') {
        if (newPassword !== confirmPassword) {
          throw new Error('Senhas não conferem');
        }
        if (newPassword.length < 8) {
          throw new Error('Senha deve ter pelo menos 8 caracteres');
        }
      }

      const { data, error } = await supabase.functions.invoke('admin-password-reset', {
        body: {
          adminId: admin.id,
          newPassword: method === 'direct' ? newPassword : undefined,
          sendEmail: method === 'email',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.method === 'email_sent') {
        toast.success('Email de redefinição enviado');
      } else {
        toast.success('Senha redefinida com sucesso');
      }
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const resetForm = () => {
    setMethod('email');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetMutation.mutate();
  };

  if (!admin) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Redefinir Senha
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">{admin.name}</p>
            <p className="text-xs text-muted-foreground">{admin.email}</p>
          </div>

          <div className="space-y-3">
            <Label>Método de Redefinição</Label>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 cursor-pointer">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Enviar Email</p>
                    <p className="text-xs text-muted-foreground">
                      Envia link de redefinição para o email do admin
                    </p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 cursor-pointer">
                <RadioGroupItem value="direct" id="direct" />
                <Label htmlFor="direct" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Definir Nova Senha</p>
                    <p className="text-xs text-muted-foreground">
                      Define uma nova senha diretamente
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {method === 'direct' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  required
                />
              </div>

              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">Senhas não conferem</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={resetMutation.isPending || (method === 'direct' && newPassword !== confirmPassword)}
            >
              {resetMutation.isPending ? 'Processando...' : 'Redefinir Senha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
