import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogIn, Loader2, Mail, Lock, User, Shield, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ROUTES } from '@/constants/routes';
import type { UserRole } from '@/types/auth';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('aluno');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Form validation
  const isFormValid = 
    name.trim().length > 0 &&
    email.includes('@') && 
    password.length >= 6 &&
    password === confirmPassword &&
    role;

  // Role-based routing helper
  const getRoleBasedRoute = (userRole: UserRole): string => {
    switch (userRole) {
      case 'secretaria':
        return ROUTES.SECRETARIA.DASHBOARD;
      case 'professor':
        return ROUTES.PROFESSOR.DASHBOARD;
      case 'aluno':
        return ROUTES.ALUNO.DASHBOARD;
      default:
        return '/dashboard';
    }
  };

  if (user) {
    const redirectPath = getRoleBasedRoute(user.role);
    return <Navigate to={redirectPath} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || !isFormValid) {
      return;
    }
    
    setFormError('');
    setIsSubmitting(true);
    
    try {
      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: name.trim(),
            role: role,
          }
        }
      });

      if (error) {
        setFormError(error.message);
      } else if (data?.user) {
        toast({
          title: "Conta criada com sucesso!",
          description: "Verifique seu email para confirmar sua conta.",
        });
        
        // User will be redirected automatically once email is confirmed
      }
    } catch (error) {
      console.error('Registration error:', error);
      setFormError("Erro interno. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/30 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-primary" />
            </div>
            <CardTitle className="text-xl font-bold">Criar Conta</CardTitle>
          </div>
          <CardDescription className="text-sm text-muted-foreground">
            Cadastre-se no Comunika
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {formError && (
            <div 
              className="text-center py-3 px-4 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive"
              role="alert"
            >
              {formError}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-medium">
                Nome completo
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Digite seu nome"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setFormError('');
                  }}
                  className="pl-10 h-12 bg-background/50 border-border/50"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value.trim());
                    setFormError('');
                  }}
                  className="pl-10 h-12 bg-background/50 border-border/50"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Role Field */}
            <div className="space-y-2">
              <Label htmlFor="role" className="text-xs font-medium">
                Tipo de usuário
              </Label>
              <Select value={role} onValueChange={(value: UserRole) => setRole(value)} disabled={isSubmitting}>
                <SelectTrigger className="h-12 bg-background/50 border-border/50">
                  <SelectValue placeholder="Selecione seu tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aluno">Aluno</SelectItem>
                  <SelectItem value="professor">Professor</SelectItem>
                  <SelectItem value="secretaria">Secretaria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFormError('');
                  }}
                  className="pl-10 pr-11 h-12 bg-background/50 border-border/50"
                  required
                  minLength={6}
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 p-0 hover:bg-muted/50"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-xs font-medium">
                Confirmar senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Digite a senha novamente"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setFormError('');
                  }}
                  className="pl-10 pr-11 h-12 bg-background/50 border-border/50"
                  required
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 p-0 hover:bg-muted/50"
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">As senhas não coincidem</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12"
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando conta...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Criar conta
                </>
              )}
            </Button>
          </form>

          <div className="text-center pt-4 border-t border-border/20">
            <p className="text-xs text-muted-foreground">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Fazer login
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;