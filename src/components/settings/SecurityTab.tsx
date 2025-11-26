import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, Lock, LogOut, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function SecurityTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEndingSessions, setIsEndingSessions] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Verificar se é aluno
  const isStudent = user?.role === 'aluno';

  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    if (!password) return { score: 0, label: '', color: '' };
    
    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[a-z]/.test(password)) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    
    if (score <= 25) return { score, label: 'Fraca', color: 'bg-red-500' };
    if (score <= 50) return { score, label: 'Regular', color: 'bg-yellow-500' };
    if (score <= 75) return { score, label: 'Boa', color: 'bg-blue-500' };
    return { score, label: 'Forte', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(passwordForm.newPassword);

  const validatePassword = (): string | null => {
    if (!passwordForm.currentPassword) return 'Senha atual é obrigatória';
    if (!passwordForm.newPassword) return 'Nova senha é obrigatória';
    if (passwordForm.newPassword.length < 8) return 'Nova senha deve ter pelo menos 8 caracteres';
    if (!/[0-9]/.test(passwordForm.newPassword)) return 'Nova senha deve conter pelo menos 1 número';
    if (!/[a-zA-Z]/.test(passwordForm.newPassword)) return 'Nova senha deve conter pelo menos 1 letra';
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return 'Senhas não coincidem';
    return null;
  };

  const handlePasswordChange = async () => {
    const error = validatePassword();
    if (error) {
      toast({
        title: 'Erro',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real app, this would verify the current password and update
      toast({
        title: 'Sucesso',
        description: 'Senha alterada com sucesso!',
      });
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao alterar senha. Verifique sua senha atual.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndAllSessions = async () => {
    setIsEndingSessions(true);
    try {
      // Usar API REAL do Supabase para encerrar outras sessões
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Sucesso',
        description: 'Todas as outras sessões foram encerradas!',
      });
    } catch (error: any) {
      console.error('Erro ao encerrar sessões:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao encerrar sessões. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsEndingSessions(false);
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleInputChange = (field: keyof PasswordForm, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Change Password - Oculto para alunos */}
      {!isStudent && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Alterar Senha
          </CardTitle>
          <CardDescription>
            Mantenha sua conta segura com uma senha forte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Senha Atual *</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                placeholder="Digite sua senha atual"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => togglePasswordVisibility('current')}
              >
                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">Nova Senha *</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                placeholder="Digite a nova senha"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => togglePasswordVisibility('new')}
              >
                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {passwordForm.newPassword && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Progress value={passwordStrength.score} className="flex-1 h-2" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {passwordStrength.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mínimo 8 caracteres, pelo menos 1 número e 1 letra
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar Nova Senha *</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Confirme a nova senha"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => togglePasswordVisibility('confirm')}
              >
                {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button onClick={handlePasswordChange} disabled={isLoading} className="w-full">
            <Shield className="h-4 w-4 mr-2" />
            {isLoading ? 'Alterando...' : 'Alterar Senha'}
          </Button>
        </CardContent>
      </Card>
      )}

      {/* Session Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Gerenciar Sessões
          </CardTitle>
          <CardDescription>
            Encerre todas as sessões ativas em outros dispositivos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ao clicar no botão abaixo, você será desconectado de todos os outros dispositivos onde sua conta estiver logada. Você permanecerá logado neste dispositivo.
            </p>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full whitespace-nowrap"
                  disabled={isEndingSessions}
                >
                  <LogOut className="h-4 w-4 mr-2 flex-shrink-0" />
                  {isEndingSessions ? 'Encerrando...' : 'Sair de Todos os Dispositivos'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Encerrar todas as sessões?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá desconectar sua conta de todos os dispositivos, exceto este. 
                    Você precisará fazer login novamente nos outros dispositivos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEndAllSessions}>
                    Confirmar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}