import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';
import klaseLogo from '@/assets/klase-logo.png';
import { usePeopleStore } from '@/stores/people-store';
import { logAudit } from '@/stores/audit-store';
import { AuditService } from '@/services/audit-service';

export default function AlterarSenha() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if user needs to change password
  const userNeedsPasswordChange = user?.mustChangePassword === true;

  // If user is not logged in or doesn't need to change password, redirect
  if (!user || !userNeedsPasswordChange) {
    const roleBasedRoute = user?.role === 'secretaria' 
      ? '/dashboard' 
      : user?.role === 'professor' 
        ? '/professor/dashboard' 
        : '/aluno/feed';
    return <Navigate to={roleBasedRoute} replace />;
  }

  const isPasswordValid = () => {
    if (newPassword.length < 8) return false;
    if (newPassword !== confirmPassword) return false;
    
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    
    return hasUpperCase && hasLowerCase && hasNumbers;
  };

  const getPasswordStrength = () => {
    if (newPassword.length < 8) return { level: 'weak', text: 'Muito fraca' };
    
    let score = 0;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/\d/.test(newPassword)) score++;
    if (/[^a-zA-Z0-9]/.test(newPassword)) score++;
    if (newPassword.length >= 12) score++;
    
    if (score < 3) return { level: 'weak', text: 'Fraca' };
    if (score < 4) return { level: 'medium', text: 'Média' };
    return { level: 'strong', text: 'Forte' };
  };

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid()) return;

    setIsSubmitting(true);

    try {
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user in people store
      const peopleStore = usePeopleStore.getState();
      await peopleStore.updatePerson(user.id, {
        passwordHash: hashedPassword,
        mustChangePassword: false // Clear the flag
      });

      // Update user in auth context
      updateUser({ mustChangePassword: false });

      // Log audit event
      logAudit({
        action: 'UPDATE',
        entity: 'USER',
        entity_id: user.id,
        entity_label: `Senha alterada pelo usuário ${user.name}`,
        scope: 'GLOBAL',
        meta: {
          fields: ['password', 'mustChangePassword'],
          self_service: true,
          forced_change: true
        },
        diff_json: {
          password: { before: '[HASH]', after: '[HASH_UPDATED]' },
          mustChangePassword: { before: true, after: false }
        },
        actor_id: user.id,
        actor_name: user.name,
        actor_email: user.email,
        actor_role: user.role.toUpperCase()
      });

      // Track telemetry
      AuditService.track('passwordReset.userChanged', user.id, {
        selfService: true,
        forcedChange: true
      });

      toast({
        title: "Senha alterada com sucesso!",
        description: "Sua nova senha foi definida. Agora você pode acessar o sistema normalmente.",
      });

      // Redirect to appropriate dashboard
      const roleBasedRoute = user.role === 'secretaria' 
        ? '/dashboard' 
        : user.role === 'professor' 
          ? '/professor/dashboard' 
          : '/aluno/feed';
      
      navigate(roleBasedRoute, { replace: true });
      
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar a senha. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-[length:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />
      
      <Card className="w-full max-w-md relative z-10 border-border/30 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="flex items-center justify-center mb-1">
            <img src={klaseLogo} alt="Klase" className="h-10 w-auto" />
          </div>
          <CardDescription className="text-sm text-muted-foreground">
            Alterar senha obrigatória
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Warning message */}
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-sm">Alteração obrigatória</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Sua senha foi redefinida pela secretaria. Por segurança, você deve criar uma nova senha antes de continuar.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite sua nova senha"
                    className="pl-10 pr-11"
                    required
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme sua nova senha"
                    className="pl-10"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Password strength indicator */}
              {newPassword && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Força da senha:</span>
                    <span className={`text-sm font-medium ${
                      strength.level === 'strong' ? 'text-success' : 
                      strength.level === 'medium' ? 'text-warning' : 'text-destructive'
                    }`}>
                      {strength.text}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${
                      strength.level === 'strong' ? 'bg-success w-full' : 
                      strength.level === 'medium' ? 'bg-warning w-2/3' : 'bg-destructive w-1/3'
                    }`} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Mínimo: 8 caracteres, maiúscula, minúscula e número
                  </div>
                </div>
              )}

              {/* Validation messages */}
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <div className="text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  As senhas não coincidem
                </div>
              )}

              {isPasswordValid() && (
                <div className="text-sm text-success flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Senha válida
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={!isPasswordValid() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  Alterando senha...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Alterar senha
                </>
              )}
            </Button>
          </form>

          {/* Security info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <h4 className="font-medium text-sm mb-2">Requisitos de segurança:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Mínimo de 8 caracteres</li>
              <li>• Pelo menos uma letra maiúscula</li>
              <li>• Pelo menos uma letra minúscula</li>
              <li>• Pelo menos um número</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}