import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ResetPasswordDialog } from '@/components/auth/ResetPasswordDialog';
import { DynamicHeadline } from '@/components/auth/DynamicHeadline';
import { PasswordResetTester } from '@/components/debug/PasswordResetTester';
import { LogIn, Loader2, Mail, Lock, Eye, EyeOff, Shield, ArrowRight, AlertTriangle, Calendar, MessageSquare, BookOpen, ChevronDown } from 'lucide-react';
import { HoloCTA } from '@/components/ui/holo-cta';
import { useToast } from '@/hooks/use-toast';
import { ROUTES } from '@/constants/routes';
import { passwordResetStore } from '@/stores/password-reset-store';
import type { UserRole } from '@/types/auth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const { user, login, isLoading, createDemoUser } = useAuth();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  // Form validation - computed values
  const isFormValid = email.includes('@') && password.length > 0;
  const isFormSubmitting = isSubmitting || isLoading;

  // Load saved email on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('comunika.loginSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.rememberEmail && settings.email) {
          setEmail(atob(settings.email)); // Simple decode
          setRememberEmail(true);
        }
      } catch {
        // Ignore parsing errors
      }
    }
  }, []);

  // Caps Lock detector
  useEffect(() => {
    const detectCapsLock = (e: Event) => {
      // Verificar se é um KeyboardEvent e se getModifierState existe
      if (e instanceof KeyboardEvent && typeof e.getModifierState === 'function') {
        setIsCapsLockOn(e.getModifierState('CapsLock'));
      }
    };

    document.addEventListener('keydown', detectCapsLock);
    document.addEventListener('keyup', detectCapsLock);

    return () => {
      document.removeEventListener('keydown', detectCapsLock);
      document.removeEventListener('keyup', detectCapsLock);
    };
  }, []);

  // Enhanced keyboard handling (Enter key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Enter if we're not already submitting
      if (e.key === 'Enter' && !isFormSubmitting) {
        const target = e.target as HTMLElement;
        
        // Check if the Enter is within our form
        if (target && formRef.current?.contains(target)) {
          e.preventDefault();
          
          // If it's an input field, submit the form
          if (target.tagName === 'INPUT') {
            const form = formRef.current;
            if (form) {
              form.requestSubmit();
            }
          }
        }
      }
      
      // Ctrl/Cmd+Enter anywhere on the page (if form is present)
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isFormSubmitting) {
        e.preventDefault();
        const form = formRef.current;
        if (form) {
          form.requestSubmit();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFormSubmitting]);

  // Role-based routing helper
  const getRoleBasedRoute = (role: UserRole): string => {
    switch (role) {
      case 'administrador':
        return ROUTES.ADMIN.DASHBOARD;
      case 'secretaria':
        return ROUTES.SECRETARIA.DASHBOARD;
      case 'professor':
        return ROUTES.PROFESSOR.DASHBOARD;
      case 'aluno':
        return ROUTES.ALUNO.DASHBOARD;
      default:
        return '/dashboard'; // Safe fallback
    }
  };

  if (user) {
    const redirectPath = getRoleBasedRoute(user.role);
    return <Navigate to={redirectPath} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isFormSubmitting) {
      return;
    }
    
    // Validação básica com feedback adequado
    if (email.trim() === '' || password.trim() === '') {
      setFormError('Por favor, preencha email e senha.');
      setShowError(true);
      setTimeout(() => setShowError(false), 1200);
      
      // Focus no primeiro campo vazio
      if (email.trim() === '') {
        document.getElementById('email')?.focus();
      } else {
        document.getElementById('password')?.focus();
      }
      return;
    }
    
    setFormError('');
    setShowError(false);
    setIsSubmitting(true);
    
    try {
      const result = await login(email.trim(), password);
      
      if (result.success) {
        // Save email preference
        if (rememberEmail) {
          localStorage.setItem('comunika.loginSettings', JSON.stringify({
            rememberEmail: true,
            email: btoa(email.trim())
          }));
        } else {
          localStorage.removeItem('comunika.loginSettings');
        }

        setShowSuccess(true);
        
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo ao Comunika.",
        });
      } else {
        setFormError(result.error || "Email ou senha incorretos.");
        setShowError(true);
        
        // Focus first invalid field
        const emailInput = document.getElementById('email') as HTMLInputElement;
        const passwordInput = document.getElementById('password') as HTMLInputElement;
        
        if (!email.includes('@')) {
          emailInput?.focus();
        } else {
          passwordInput?.focus();
          passwordInput?.select();
        }

        setTimeout(() => {
          setShowError(false);
        }, 1200);
      }
    } catch (error) {
      console.error('Login error:', error);
      setFormError("Erro interno. Tente novamente.");
      setShowError(true);
      setTimeout(() => {
        setShowError(false);
      }, 1200);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🚨 SECURITY FIX: Quick login functionality moved to /dev/quick-login
  // This component should only handle normal login flow
  // Development quick login is now isolated in src/pages/dev/QuickLoginDev.tsx

  return (
    <div className="min-h-screen bg-background">
      {/* Background patterns - more subtle */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-[length:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />
      
      {/* Container with max width and centered */}
      <div className="relative z-10 min-h-screen w-full max-w-[1360px] mx-auto">
        
        {/* Main grid layout - 12 columns system */}
        <div className="min-h-screen grid lg:grid-cols-12 lg:gap-x-8 xl:gap-x-10 2xl:gap-x-12 items-center py-6 lg:py-10">
          
          {/* Hero Panel - col-span-7 on lg+ */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-center px-6 xl:px-8 py-8">
            <div className="w-full" style={{ maxWidth: 'clamp(560px, 48vw, 620px)' }}>
              <h1 
                className="font-bold tracking-tight text-foreground mb-4 leading-tight"
                style={{ fontSize: 'clamp(28px, 3.2vw, 44px)' }}
              >
                Comunicação escolar,{' '}
                <span className="text-primary/90">sem atrito</span>
              </h1>
              
              <p 
                className="text-muted-foreground mb-8 leading-relaxed max-w-[65ch]"
                style={{ fontSize: 'clamp(16px, 1.1vw, 18px)' }}
              >
                Conecte professores, alunos e secretaria em uma plataforma intuitiva e poderosa.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground leading-tight">Calendário inteligente</h3>
                    <p className="text-sm text-muted-foreground leading-snug max-w-[45ch]">Visualize atividades, eventos e prazos em uma única tela organizada</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground leading-tight">Feed unificado</h3>
                    <p className="text-sm text-muted-foreground leading-snug max-w-[45ch]">Comunicação centralizada entre toda a comunidade escolar</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground leading-tight">Gestão de atividades</h3>
                    <p className="text-sm text-muted-foreground leading-snug max-w-[45ch]">Crie, distribua e acompanhe atividades com facilidade</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Hero mobile version - md only */}
          <div className="block md:block lg:hidden px-6 py-8 text-center">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-3">
              Comunicação escolar, <span className="text-primary/90">sem atrito</span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mb-6 max-w-md mx-auto">
              Conecte professores, alunos e secretaria em uma plataforma intuitiva.
            </p>
          </div>
          
          {/* Login Card - col-span-5 on lg+ */}
          <div className="flex items-center justify-center px-4 lg:col-span-5 lg:px-6 py-4 lg:py-8">
            <Card 
              className="w-full border-border/30 bg-card/95 backdrop-blur-sm shadow-lg"
              style={{ 
                maxWidth: 'clamp(360px, 28vw, 440px)',
                minWidth: '360px'
              }}
            >
              <CardHeader className="text-center space-y-3 px-6 py-6">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-bold">Comunika</CardTitle>
                </div>
                <CardDescription className="text-sm text-muted-foreground">
                  Acesse sua conta
                </CardDescription>
                <DynamicHeadline />
              </CardHeader>

              <CardContent className="space-y-5 px-6 pb-6">
                {formError && (
                  <div 
                    className="text-center py-3 px-4 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive"
                    role="alert"
                    aria-live="polite"
                    id="form-error"
                  >
                    {formError}
                  </div>
                )}
                
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-medium text-foreground">
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
                        className="pl-10 h-12 text-base bg-background/50 border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                        required
                        autoComplete="email"
                        disabled={isFormSubmitting}
                        aria-invalid={!!formError}
                        aria-describedby={formError ? "form-error" : undefined}
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-medium text-foreground">
                      Senha
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Digite sua senha"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setFormError('');
                        }}
                        className="pl-10 pr-11 h-12 text-base bg-background/50 border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                        required
                        autoComplete="current-password"
                        disabled={isFormSubmitting}
                        aria-invalid={!!formError}
                        aria-describedby={formError ? "form-error" : undefined}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 p-0 hover:bg-muted/50"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        aria-pressed={showPassword}
                        disabled={isFormSubmitting}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {/* Caps Lock Warning */}
                    {isCapsLockOn && (
                      <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-2 rounded border border-amber-500/20">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        <span>Caps Lock ativado</span>
                      </div>
                    )}
                  </div>

                  {/* Remember Email Toggle */}
                  <div className="flex items-center space-x-2 py-1">
                    <Checkbox
                      id="remember-email"
                      checked={rememberEmail}
                      onCheckedChange={(checked) => setRememberEmail(checked === true)}
                      disabled={isFormSubmitting}
                    />
                    <Label htmlFor="remember-email" className="text-xs cursor-pointer text-muted-foreground">
                      Lembrar meu email
                    </Label>
                  </div>

                  {/* HoloCTA Login Button */}
                  <HoloCTA
                    type="submit"
                    loading={isFormSubmitting}
                    success={showSuccess}
                    error={showError}
                    disabled={isFormSubmitting}
                    ariaLabel={isFormSubmitting ? "Fazendo login..." : "Fazer login no Comunika"}
                    className="w-full h-12"
                  >
                    {isFormSubmitting ? 'Entrando...' : 'Entrar'}
                  </HoloCTA>

                  <div className="text-center pt-1">
                    <Button 
                      type="button" 
                      variant="link" 
                      className="text-xs text-muted-foreground hover:text-primary p-0 h-auto font-normal"
                      disabled={isFormSubmitting}
                      onClick={() => {
                        try {
                          const request = passwordResetStore.createRequest(email);
                          toast({
                            title: "Solicitação enviada",
                            description: `Solicitação de reset criada para ${email}. A secretaria foi notificada.`,
                            duration: 5000,
                          });
                        } catch (error: any) {
                          toast({
                            title: "Erro na solicitação",
                            description: error.message || 'Não foi possível criar a solicitação.',
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                    Preciso redefinir minha senha
                  </Button>
                </div>
              </form>

                {/* Registration Link */}
                <div className="text-center pt-4">
                  <p className="text-xs text-muted-foreground">
                    Não tem uma conta?{' '}
                    <Button 
                      type="button" 
                      variant="link" 
                      className="text-xs text-primary hover:underline p-0 h-auto font-medium"
                      disabled={isFormSubmitting}
                      onClick={() => window.location.href = '/register'}
                    >
                      Criar conta
                    </Button>
                  </p>
                </div>

                {/* 🚨 SECURITY: Demo accounts removed from production */}
                {/* Quick login functionality available at /dev/quick-login in development */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="border-t border-border/30 pt-4 mt-5">
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => window.location.href = '/dev/quick-login'}
                      >
                        🔧 Acesso rápido para desenvolvimento
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Dev Tools - Password Reset Tester */}
        {process.env.NODE_ENV === 'development' && (
          <div className="max-w-md mx-auto mt-6 px-4">
            <PasswordResetTester />
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;