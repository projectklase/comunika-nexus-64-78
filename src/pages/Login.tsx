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
import { LogIn, Loader2, Mail, Lock, Eye, EyeOff, ArrowRight, AlertTriangle, AlertCircle, Clock, Gamepad2, Brain, TrendingUp, ChevronDown } from 'lucide-react';
import klaseLogo from '@/assets/logo-klase-no-padding.png';
import { HoloCTA } from '@/components/ui/holo-cta';
import { useToast } from '@/hooks/use-toast';
import { useLoginRateLimit } from '@/hooks/useLoginRateLimit';
import { useUserSettingsStore } from '@/stores/user-settings-store';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';
import { passwordResetStore } from '@/stores/password-reset-store';
import { useFeatureFlag } from '@/hooks/usePlatformFeatureFlags';
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
  const [hideUI, setHideUI] = useState(false);
  const [showError, setShowError] = useState(false);
  const [remainingLockTime, setRemainingLockTime] = useState(0);
  const {
    user,
    login,
    isLoading,
    createDemoUser
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    isLocked,
    getRemainingLockTime,
    recordFailedAttempt,
    resetAttempts,
    getAttemptsRemaining
  } = useLoginRateLimit();
  const {
    rememberEmail: savedRememberEmail,
    lastEmail,
    setLastEmail,
    updateSetting
  } = useUserSettingsStore();
  const formRef = useRef<HTMLFormElement>(null);
  
  // Feature flag controlado pelo super admin
  const { enabled: showQuickLogins } = useFeatureFlag('quick_logins_visible');

  // Form validation - computed values
  const isFormValid = email.includes('@') && password.length > 0;
  const isFormSubmitting = isSubmitting || isLoading;

  // Force default theme on login screen to prevent premium theme leakage
  useEffect(() => {
    const root = document.documentElement;

    // If premium theme is applied, remove it
    if (root.hasAttribute('data-theme')) {
      const currentTheme = root.getAttribute('data-theme');
      const isPremiumTheme = currentTheme?.startsWith('theme_');
      if (isPremiumTheme) {
        console.log('[Login] Removing leaked premium theme:', currentTheme);
        root.removeAttribute('data-theme');
        root.classList.add('dark'); // Apply default dark-neon theme
      }
    }
  }, []); // Run only once on mount

  // Load email from URL params (for onboarding PDF links)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const prefilledEmail = searchParams.get('email');
    if (prefilledEmail) {
      setEmail(prefilledEmail);
      return; // URL param takes priority
    }
  }, []);

  // Load saved email from user settings store
  useEffect(() => {
    if (savedRememberEmail && lastEmail && !email) {
      setEmail(lastEmail);
      setRememberEmail(true);
    }
  }, [savedRememberEmail, lastEmail]);

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

  // DEBUG: Login render diagnostics (TEMPORARY)
  useEffect(() => {
    console.log('🔍 [LOGIN RENDER]', {
      hasUser: !!user,
      userEmail: user?.email,
      isLoading,
      isSubmitting,
      showSuccess,
      hideUI,
      timestamp: new Date().toISOString()
    });
  }, [user, isLoading, isSubmitting, showSuccess, hideUI]);

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
      case 'superadmin':
        return '/platform';
      case 'administrador':
        return ROUTES.ADMIN.DASHBOARD;
      case 'secretaria':
        return ROUTES.SECRETARIA.DASHBOARD;
      case 'professor':
        return ROUTES.PROFESSOR.DASHBOARD;
      case 'aluno':
        return ROUTES.ALUNO.DASHBOARD;
      default:
        return '/dashboard';
      // Safe fallback
    }
  };

  // Atualizar countdown a cada segundo quando bloqueado
  useEffect(() => {
    if (email && isLocked(email)) {
      const updateCountdown = () => {
        const remaining = getRemainingLockTime(email);
        setRemainingLockTime(remaining);
        if (remaining <= 0) {
          setFormError('');
          setShowError(false);
        }
      };
      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    } else {
      setRemainingLockTime(0);
    }
  }, [email, isLocked, getRemainingLockTime]);
  const formatCountdown = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor(ms % 60000 / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  if (user) {
    console.log('🚀 [NAVIGATE] Redirecting to:', getRoleBasedRoute(user.role), 'hideUI:', hideUI);
    const redirectPath = getRoleBasedRoute(user.role);
    return <Navigate to={redirectPath} replace />;
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isFormSubmitting) {
      return;
    }

    // Verificar bloqueio ANTES de tentar login
    if (email && isLocked(email)) {
      const remaining = getRemainingLockTime(email);
      setRemainingLockTime(remaining);
      setFormError(`Conta temporariamente bloqueada. Tente novamente em ${formatCountdown(remaining)}.`);
      setShowError(true);
      return;
    }

    // Validação básica com feedback adequado
    if (email.trim() === '' || password.trim() === '') {
      setFormError('Por favor, preencha email e senha.');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);

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
    console.log('📤 [LOGIN] Starting login for:', email);
    try {
      const result = await login(email.trim(), password);
      console.log('📥 [LOGIN] Result:', result);
      if (result.success) {
        // Limpar tentativas após sucesso
        resetAttempts(email);

        // Save email preference to user settings store
        if (rememberEmail) {
          setLastEmail(email.trim());
          updateSetting('rememberEmail', true);
        } else {
          setLastEmail('');
          updateSetting('rememberEmail', false);
        }
        console.log('✅ [LOGIN] Success - setting hideUI=true');
        setHideUI(true);
        setShowSuccess(true);
        console.log('✨ [LOGIN] Set showSuccess=true');
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo ao Klase."
        });
      } else {
        // Registrar falha
        recordFailedAttempt(email);
        const attemptsRemaining = getAttemptsRemaining(email);

        // Verificar se atingiu limite após esta falha
        if (isLocked(email)) {
          const lockTime = getRemainingLockTime(email);
          setRemainingLockTime(lockTime);
          setFormError(`Muitas tentativas incorretas. Conta bloqueada por ${formatCountdown(lockTime)}.`);
          toast({
            variant: "destructive",
            title: "Conta bloqueada",
            description: `Muitas tentativas falhadas. Tente novamente em ${formatCountdown(lockTime)}.`
          });
        } else {
          setFormError(result.error || "Email ou senha incorretos.");

          // Avisar se está próximo do limite
          if (attemptsRemaining <= 2) {
            toast({
              variant: "destructive",
              title: "Falha no login",
              description: `Email ou senha incorretos. Restam ${attemptsRemaining} tentativa${attemptsRemaining > 1 ? 's' : ''} antes do bloqueio.`
            });
          } else {
            toast({
              variant: "destructive",
              title: "Falha no login",
              description: result.error || "Email ou senha incorretos. Verifique suas credenciais."
            });
          }
        }
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
        }, 5000);
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = "Erro interno. Tente novamente.";
      setFormError(errorMessage);
      setShowError(true);
      toast({
        variant: "destructive",
        title: "Erro no sistema",
        description: errorMessage
      });
      setTimeout(() => {
        setShowError(false);
      }, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };
  const quickLogin = async (role: string = 'secretaria') => {
    if (isFormSubmitting) return;
    setFormError('');
    setIsSubmitting(true);
    try {
      // ✅ Credenciais reais
      const credentials = {
        secretaria: {
          email: 'secretaria@comunika.com',
          password: '123456',
          name: 'Maria Silva'
        },
        professor: {
          email: 'julianegrini@gmail.com',
          password: 'Prof9105!',
          name: 'Juliane Grini'
        },
        aluno: {
          email: 'alinemenezes@gmail.com',
          password: 'Praia-Chuva-Lua-814$',
          name: 'Aline Menezes'
        },
        administrador: {
          email: 'admin.klase@comunika.com',
          password: 'NexusAdmin#2025!',
          name: 'Admin Klase'
        }
      };
      const {
        email,
        password,
        name
      } = credentials[role as keyof typeof credentials];
      console.log(`QuickLogin attempt for ${role}: ${email}`);

      // ✅ Tenta login direto com credenciais reais (contas já existem no banco)
      const result = await login(email, password);
      console.log(`QuickLogin result for ${role}:`, result);
      if (result.success) {
        setHideUI(true);
        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo(a), ${name}!`
        });
      } else {
        console.error(`Login failed for ${role}: ${result.error}`);
        setFormError(result.error || `Erro ao fazer login rápido (${role}).`);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('QuickLogin error:', error);
      setFormError("Erro interno. Tente novamente.");
      setIsSubmitting(false);
    }
  };
  return <div className={cn("min-h-screen bg-background transition-opacity duration-200", hideUI && "opacity-0")}>
      {/* Background patterns - more subtle */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-[length:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />
      
      {/* Container with max width and centered */}
      <div className="relative z-10 min-h-screen w-full max-w-[1360px] mx-auto px-4 sm:px-6 overflow-hidden">
        
        {/* Main grid layout - 12 columns system */}
        <div className="min-h-screen grid lg:grid-cols-12 lg:gap-x-8 xl:gap-x-10 2xl:gap-x-12 items-center py-6 lg:py-10">
          
          {/* Hero Panel - col-span-7 on lg+ */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-center px-6 xl:px-8 py-8">
            <div className="w-full" style={{
            maxWidth: 'clamp(560px, 48vw, 620px)'
          }}>
              <h1 className="font-bold tracking-tight text-foreground mb-4 leading-tight" style={{
              fontSize: 'clamp(28px, 3.2vw, 44px)'
            }}>
                Bem-vindo ao próximo nível{' '}
                <span className="text-primary/90">da sua educação</span>
              </h1>
              
              <p className="text-muted-foreground mb-8 leading-relaxed max-w-[65ch]" style={{
              fontSize: 'clamp(16px, 1.1vw, 18px)'
            }}>
                Um ecossistema premium onde inteligência, performance e conquistas se encontram. Uma experiência exclusiva para quem busca ir além.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Gamepad2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground leading-tight">Ecossistema de Engajamento</h3>
                    <p className="text-sm text-muted-foreground leading-snug max-w-[45ch]">Mais que uma plataforma, uma cultura. Transformamos a rotina escolar em uma jornada interativa onde cada ação positiva gera valor real, mensurável e recompensador.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground leading-tight">Inteligência de Dados</h3>
                    <p className="text-sm text-muted-foreground leading-snug max-w-[45ch]">Tecnologia que antecipa necessidades. Monitoramento em tempo real que oferece clareza absoluta sobre o progresso, conectando objetivos acadêmicos a resultados práticos.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground leading-tight">Incentivo à Alta Performance</h3>
                    <p className="text-sm text-muted-foreground leading-snug max-w-[45ch]">Uma metodologia exclusiva que premia a constância e a estratégia. Gamificação aplicada com sofisticação para despertar o máximo potencial e criar hábitos de sucesso.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Hero mobile version - md only */}
          <div className="block md:block lg:hidden px-4 sm:px-6 py-6 sm:py-8 text-center">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-3">
              Bem-vindo ao próximo nível <span className="text-primary/90">da sua educação</span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mb-6 max-w-md mx-auto">
              Um ecossistema premium onde inteligência, performance e conquistas se encontram.
            </p>
          </div>
          
          {/* Login Card - col-span-5 on lg+ */}
          <div className="flex items-center justify-center px-0 lg:col-span-5 lg:px-6 py-4 lg:py-8 w-full">
            <Card className="w-full max-w-[440px] border-border/30 bg-card/95 backdrop-blur-sm shadow-lg">
              <CardHeader className="text-center space-y-1 px-6 py-6">
                <div className="flex items-center justify-center">
                  <img src={klaseLogo} alt="Klase" width={262} height={64} className="h-16 w-auto" />
                </div>
                <CardDescription className="text-sm text-muted-foreground my-[15px]">
                  Acesse sua conta
                </CardDescription>
                <DynamicHeadline />
              </CardHeader>

              <CardContent className="space-y-5 px-6 pb-6">
                {formError && <div className={cn("flex items-center gap-2 py-3 px-4 rounded-lg text-sm animate-in fade-in slide-in-from-top-2 duration-300", email && isLocked(email) ? "bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 animate-pulse" : "bg-destructive/15 border border-destructive/30 text-destructive")} role="alert" aria-live="assertive" id="form-error">
                    {email && isLocked(email) ? <Clock className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                    <span>{formError}</span>
                  </div>}
                
                {email && !isLocked(email) && getAttemptsRemaining(email) < 5 && getAttemptsRemaining(email) > 0 && <div className="flex items-center gap-2 py-2 px-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-600 dark:text-amber-400" role="status" aria-live="polite">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>
                      {getAttemptsRemaining(email) === 1 ? "Última tentativa antes do bloqueio temporário." : `Restam ${getAttemptsRemaining(email)} tentativas antes do bloqueio.`}
                    </span>
                  </div>}
                
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-medium text-foreground">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => {
                      setEmail(e.target.value.trim());
                    }} className="pl-10 h-12 text-base bg-background/50 border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 disabled:opacity-50" required autoComplete="email" disabled={isFormSubmitting || email && isLocked(email)} aria-invalid={!!formError} aria-describedby={formError ? "form-error" : undefined} />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-medium text-foreground">
                      Senha
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="password" type={showPassword ? "text" : "password"} placeholder="Digite sua senha" value={password} onChange={e => {
                      setPassword(e.target.value);
                    }} className="pl-10 pr-11 h-12 text-base bg-background/50 border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 disabled:opacity-50" required autoComplete="current-password" disabled={isFormSubmitting || email && isLocked(email)} aria-invalid={!!formError} aria-describedby={formError ? "form-error" : undefined} />
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 p-0 hover:bg-muted/50" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} disabled={isFormSubmitting}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>

                    {/* Caps Lock Warning */}
                    {isCapsLockOn && <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-2 rounded border border-amber-500/20">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        <span>Caps Lock ativado</span>
                      </div>}
                  </div>

                  {/* Remember Email Toggle */}
                  <div className="flex items-center space-x-2 py-1">
                    <Checkbox id="remember-email" checked={rememberEmail} onCheckedChange={checked => setRememberEmail(checked === true)} disabled={isFormSubmitting} />
                    <Label htmlFor="remember-email" className="text-xs cursor-pointer text-muted-foreground">
                      Lembrar meu email
                    </Label>
                  </div>

                  {/* HoloCTA Login Button */}
                  <HoloCTA type="submit" loading={isFormSubmitting} success={showSuccess} error={showError} disabled={isFormSubmitting || email && isLocked(email)} ariaLabel={email && isLocked(email) ? `Bloqueado - ${formatCountdown(remainingLockTime)}` : isFormSubmitting ? "Fazendo login..." : "Fazer login no Comunika"} className="w-full h-12">
                    {email && isLocked(email) ? <>
                        <Clock className="mr-2 h-5 w-5" />
                        Bloqueado ({formatCountdown(remainingLockTime)})
                      </> : isFormSubmitting ? 'Entrando...' : 'Entrar'}
                  </HoloCTA>

                  <div className="text-center pt-1">
                    <Button type="button" variant="link" className="text-xs text-muted-foreground hover:text-primary p-0 h-auto font-normal" disabled={isFormSubmitting} onClick={async () => {
                    try {
                      const request = await passwordResetStore.createRequest(email, 'unknown', 'Usuário', 'aluno', undefined);
                      toast({
                        title: "Solicitação enviada",
                        description: `Solicitação de reset criada para ${email}. A secretaria foi notificada.`,
                        duration: 5000
                      });
                    } catch (error: any) {
                      toast({
                        title: "Erro na solicitação",
                        description: error.message || 'Não foi possível criar a solicitação.',
                        variant: "destructive"
                      });
                    }
                  }}>
                    Preciso redefinir minha senha
                  </Button>
                </div>
              </form>

                {/* Registration Link */}
                <div className="text-center pt-4">
                  <p className="text-xs text-muted-foreground">
                    Não tem uma conta?{' '}
                    <Button type="button" variant="link" className="text-xs text-primary hover:underline p-0 h-auto font-medium" disabled={isFormSubmitting} onClick={() => window.location.href = '/register'}>
                      Criar conta
                    </Button>
                  </p>
                </div>

                {/* Demo Accounts - Controlado por feature flag do super admin */}
                {showQuickLogins && (
                <div className="border-t border-border/30 pt-4 mt-5">
                  <div className="text-center mb-3">
                    <span className="text-xs text-muted-foreground">Contas de demonstração</span>
                  </div>
                  
                  <div className="space-y-2">
                    <button type="button" onClick={() => quickLogin('secretaria')} disabled={isFormSubmitting} className="w-full h-12 flex items-center justify-between px-3 text-left bg-muted/20 hover:bg-muted/30 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group border border-transparent hover:border-border/50">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground">Secretaria</div>
                        <div className="text-xs text-muted-foreground truncate">secretaria@comunika.com</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground flex-shrink-0 ml-2 transition-all group-hover:translate-x-0.5" />
                    </button>
                    
                    <button type="button" onClick={() => quickLogin('professor')} disabled={isFormSubmitting} className="w-full h-12 flex items-center justify-between px-3 text-left bg-muted/20 hover:bg-muted/30 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group border border-transparent hover:border-border/50">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground">Professor</div>
                        <div className="text-xs text-muted-foreground truncate">julianegrini@gmail.com</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground flex-shrink-0 ml-2 transition-all group-hover:translate-x-0.5" />
                    </button>
                    
                    <button type="button" onClick={() => quickLogin('aluno')} disabled={isFormSubmitting} className="w-full h-12 flex items-center justify-between px-3 text-left bg-muted/20 hover:bg-muted/30 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group border border-transparent hover:border-border/50">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground">Aluno</div>
                        <div className="text-xs text-muted-foreground truncate">alinemenezes@gmail.com</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground flex-shrink-0 ml-2 transition-all group-hover:translate-x-0.5" />
                    </button>
                    
                    <button type="button" onClick={() => quickLogin('administrador')} disabled={isFormSubmitting} className="w-full h-12 flex items-center justify-between px-3 text-left bg-primary/10 hover:bg-primary/20 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group border border-primary/30 hover:border-primary/50">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-primary">Admin</div>
                        <div className="text-xs text-primary/70 truncate">admin.klase@comunika.com</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-primary/70 group-hover:text-primary flex-shrink-0 ml-2 transition-all group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Dev Tools - Password Reset Tester */}
        {process.env.NODE_ENV === 'development' && <div className="max-w-md mx-auto mt-6 px-4">
            <PasswordResetTester />
          </div>}
      </div>
    </div>;
};
export default Login;