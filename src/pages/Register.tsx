import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputPhone } from '@/components/ui/input-phone';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { validateName, normalizeSpaces } from '@/lib/validation';
import klaseLogo from '@/assets/logo-klase-no-padding.png';
import {
  Loader2,
  User,
  Building,
  CreditCard,
  Mail,
  Phone,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  FileText,
  MapPin,
  Hash,
  ArrowLeft,
  Sparkles,
  Users,
  School,
} from 'lucide-react';

interface FormData {
  // Etapa 1 - Dados Pessoais
  name: string;
  email: string;
  phone: string;
  password: string;
  
  // Etapa 2 - Escola
  school_name: string;
  
  // Etapa 3 - Dados Fiscais
  company_name: string;
  company_cnpj: string;
  company_address: string;
  company_number: string;
  company_neighborhood: string;
  company_zipcode: string;
  company_city: string;
  company_state: string;
  company_state_registration: string;
  
  // Etapa 4 - Plano
  plan_id: string;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  max_students: number;
  included_schools: number;
  features: any;
}

const STEPS = [
  { id: 1, label: 'Seus Dados', icon: User },
  { id: 2, label: 'Escola', icon: School },
  { id: 3, label: 'Nota Fiscal', icon: FileText },
  { id: 4, label: 'Plano', icon: CreditCard },
];

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 
  'SP', 'SE', 'TO'
];

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

function generatePassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '@#$%&*!';
  const all = lowercase + uppercase + numbers + special;
  
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

function formatCNPJ(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 14);
  return numbers
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function formatCEP(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 8);
  return numbers.replace(/^(\d{5})(\d)/, '$1-$2');
}

async function fetchAddressByCep(cep: string): Promise<{
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
} | null> {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();
    return data;
  } catch (error) {
    return null;
  }
}

export default function Register() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepAutoFilled, setCepAutoFilled] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    password: generatePassword(),
    school_name: '',
    company_name: '',
    company_cnpj: '',
    company_address: '',
    company_number: '',
    company_neighborhood: '',
    company_zipcode: '',
    company_city: '',
    company_state: '',
    company_state_registration: '',
    plan_id: '',
  });
  
  // State for Stripe redirect
  const [redirectingToStripe, setRedirectingToStripe] = useState(false);

  // Fetch plans - MUST be before any conditional returns
  useEffect(() => {
    async function fetchPlans() {
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('price_cents', { ascending: true });

        if (error) throw error;
        setPlans(data || []);
        if (data && data.length > 0) {
          setFormData(prev => ({ ...prev, plan_id: data[0].id }));
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
        toast.error('Erro ao carregar planos');
      } finally {
        setLoadingPlans(false);
      }
    }
    fetchPlans();
  }, []);

  // Redirect if already logged in - AFTER all hooks
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Show loading while redirecting to Stripe
  if (redirectingToStripe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-lg font-medium">Redirecionando para pagamento...</p>
          <p className="text-sm text-muted-foreground">Aguarde, você será direcionado ao Stripe</p>
        </div>
      </div>
    );
  }

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const regeneratePassword = () => {
    setFormData(prev => ({ ...prev, password: generatePassword() }));
  };

  const selectedPlan = plans.find(p => p.id === formData.plan_id);

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: {
        const nameError = validateName(formData.name);
        return !!(
          formData.name && 
          !nameError && 
          formData.email && 
          formData.email.includes('@') &&
          formData.password.length >= 8
        );
      }
      case 2: {
        return !!formData.school_name;
      }
      case 3: {
        const cnpjNumbers = formData.company_cnpj.replace(/\D/g, '');
        const cepNumbers = formData.company_zipcode.replace(/\D/g, '');
        return !!(
          formData.company_name &&
          cnpjNumbers.length === 14 &&
          formData.company_address &&
          formData.company_number &&
          formData.company_neighborhood &&
          cepNumbers.length === 8 &&
          formData.company_city &&
          formData.company_state
        );
      }
      case 4: {
        return !!formData.plan_id;
      }
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    } else {
      toast.error('Preencha todos os campos obrigatórios');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      // 1. Create administrator via public edge function
      const { data: adminData, error: adminError } = await supabase.functions.invoke('create-public-administrator', {
        body: {
          name: formData.name,
          email: formData.email.toLowerCase(),
          password: formData.password,
          phone: formData.phone || undefined,
          school_name: formData.school_name,
          company_name: formData.company_name,
          company_cnpj: formData.company_cnpj,
          company_address: formData.company_address,
          company_number: formData.company_number,
          company_neighborhood: formData.company_neighborhood,
          company_zipcode: formData.company_zipcode,
          company_city: formData.company_city,
          company_state: formData.company_state,
          company_state_registration: formData.company_state_registration || undefined,
          plan_id: formData.plan_id,
        }
      });

      if (adminError) {
        console.error('Admin creation error:', adminError);
        throw new Error(adminError.message || 'Erro ao criar conta de administrador');
      }
      if (!adminData?.success) {
        throw new Error(adminData?.error || 'Erro ao criar conta de administrador');
      }

      // 2. Login automatically
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: formData.email.toLowerCase(),
        password: formData.password,
      });

      if (loginError) {
        console.error('Login error:', loginError);
        throw new Error('Conta criada, mas houve erro no login automático. Faça login manualmente.');
      }

      // 3. Create Stripe checkout session with custom success URL
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
        body: { 
          priceType: selectedPlan?.slug || 'challenger',
          quantity: 1,
          successUrl: '/payment-success',
          cancelUrl: '/pending-payment',
        }
      });

      if (checkoutError) {
        console.error('Checkout error:', checkoutError);
        throw new Error('Conta criada! Erro ao iniciar pagamento. Acesse sua conta para continuar.');
      }

      if (checkoutData?.url) {
        // Set redirecting state to show loading UI
        setRedirectingToStripe(true);
        toast.success('Conta criada! Redirecionando para pagamento...');
        
        // Use location.assign for clean redirect (prevents iFrame issues)
        setTimeout(() => {
          window.location.assign(checkoutData.url);
        }, 500);
      } else {
        throw new Error('Erro ao criar sessão de pagamento');
      }

    } catch (error: any) {
      console.error('Error during registration:', error);
      toast.error(error.message || 'Erro ao criar conta');
      setLoading(false);
    }
    // Note: Don't set loading to false if redirecting, as component will unmount
  };

  // Stepper visual
  const renderStepper = () => (
    <div className="flex items-center justify-between mb-6 px-2">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        
        return (
          <div key={step.id} className="flex items-center flex-1">
            <button
              type="button"
              onClick={() => isCompleted && setCurrentStep(step.id)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                isCompleted && "cursor-pointer"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                isActive && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                isCompleted && "bg-green-500/20 text-green-500",
                !isActive && !isCompleted && "bg-muted text-muted-foreground"
              )}>
                {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={cn(
                "text-xs font-medium hidden sm:block",
                isActive && "text-primary",
                isCompleted && "text-green-500",
                !isActive && !isCompleted && "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </button>
            {index < STEPS.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-2",
                isCompleted ? "bg-green-500" : "bg-muted"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );

  // Step 1: Personal Data
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Seus Dados
        </h3>
        <p className="text-sm text-muted-foreground">Informações de acesso</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nome Completo *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => {
            const sanitized = e.target.value.replace(/[0-9]/g, '');
            setFormData(prev => ({ ...prev, name: sanitized }));
          }}
          onBlur={() => {
            const normalized = normalizeSpaces(formData.name);
            setFormData(prev => ({ ...prev, name: normalized }));
          }}
          placeholder="Seu nome completo"
          className="bg-white/5 border-white/10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="seu@email.com"
            className="bg-white/5 border-white/10 pl-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
          <InputPhone
            id="phone"
            value={formData.phone}
            onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
            placeholder="(00) 00000-0000"
            className="bg-white/5 border-white/10 pl-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha *</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="bg-white/5 border-white/10 pl-9 pr-20 font-mono text-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleCopy(formData.password, 'password')}
              >
                {copiedField === 'password' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={regeneratePassword}
            className="shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres. Clique no dado para gerar uma nova.</p>
      </div>
    </div>
  );

  // Step 2: School
  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
          <School className="w-5 h-5 text-primary" />
          Sua Escola
        </h3>
        <p className="text-sm text-muted-foreground">Dados da instituição</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="school_name">Nome da Escola *</Label>
        <div className="relative">
          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="school_name"
            value={formData.school_name}
            onChange={(e) => setFormData(prev => ({ ...prev, school_name: e.target.value }))}
            placeholder="Nome da sua escola"
            className="bg-white/5 border-white/10 pl-9"
          />
        </div>
      </div>
    </div>
  );

  // Step 3: Fiscal Data with CEP auto-fetch
  const handleCepChange = async (value: string) => {
    const formatted = formatCEP(value);
    setFormData(prev => ({ ...prev, company_zipcode: formatted }));
    
    const cleanCep = formatted.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setLoadingCep(true);
      setCepAutoFilled(false);
      const data = await fetchAddressByCep(cleanCep);
      setLoadingCep(false);
      
      if (data && !data.erro) {
        setFormData(prev => ({
          ...prev,
          company_address: data.logradouro || '',
          company_neighborhood: data.bairro || '',
          company_city: data.localidade || '',
          company_state: data.uf || '',
        }));
        setCepAutoFilled(true);
        toast.success('Endereço preenchido automaticamente!');
        setTimeout(() => {
          document.getElementById('company_number')?.focus();
        }, 100);
      } else if (data?.erro) {
        toast.error('CEP não encontrado');
      }
    }
  };

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Dados para Nota Fiscal
        </h3>
        <p className="text-sm text-muted-foreground">Informações obrigatórias para faturamento</p>
      </div>

      <div className="space-y-3">
        {/* Razão Social - full width */}
        <div className="space-y-1.5">
          <Label htmlFor="company_name">Razão Social *</Label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
              placeholder="Razão social da empresa"
              className="bg-white/5 border-white/10 pl-9"
            />
          </div>
        </div>

        {/* CNPJ + CEP - 2 colunas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="company_cnpj">CNPJ *</Label>
            <Input
              id="company_cnpj"
              value={formData.company_cnpj}
              onChange={(e) => setFormData(prev => ({ ...prev, company_cnpj: formatCNPJ(e.target.value) }))}
              placeholder="00.000.000/0000-00"
              className="bg-white/5 border-white/10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company_zipcode">CEP *</Label>
            <div className="relative">
              <Input
                id="company_zipcode"
                value={formData.company_zipcode}
                onChange={(e) => handleCepChange(e.target.value)}
                placeholder="00000-000"
                className={cn(
                  "bg-white/5 border-white/10 pr-8",
                  cepAutoFilled && "border-green-500/50"
                )}
              />
              {loadingCep && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {cepAutoFilled && !loadingCep && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Endereço + Número - 3/4 + 1/4 */}
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-3 space-y-1.5">
            <Label htmlFor="company_address">Endereço *</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="company_address"
                value={formData.company_address}
                onChange={(e) => setFormData(prev => ({ ...prev, company_address: e.target.value }))}
                placeholder="Rua, Avenida..."
                className={cn(
                  "bg-white/5 border-white/10 pl-9",
                  cepAutoFilled && formData.company_address && "border-green-500/30"
                )}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company_number">Nº *</Label>
            <Input
              id="company_number"
              value={formData.company_number}
              onChange={(e) => setFormData(prev => ({ ...prev, company_number: e.target.value }))}
              placeholder="123"
              className="bg-white/5 border-white/10"
            />
          </div>
        </div>

        {/* Bairro + Cidade + Estado - 3 colunas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="company_neighborhood">Bairro *</Label>
            <Input
              id="company_neighborhood"
              value={formData.company_neighborhood}
              onChange={(e) => setFormData(prev => ({ ...prev, company_neighborhood: e.target.value }))}
              placeholder="Bairro"
              className={cn(
                "bg-white/5 border-white/10",
                cepAutoFilled && formData.company_neighborhood && "border-green-500/30"
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company_city">Cidade *</Label>
            <Input
              id="company_city"
              value={formData.company_city}
              onChange={(e) => setFormData(prev => ({ ...prev, company_city: e.target.value }))}
              placeholder="Cidade"
              className={cn(
                "bg-white/5 border-white/10",
                cepAutoFilled && formData.company_city && "border-green-500/30"
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company_state">UF *</Label>
            <Select
              value={formData.company_state}
              onValueChange={(value) => setFormData(prev => ({ ...prev, company_state: value }))}
            >
              <SelectTrigger className={cn(
                "bg-white/5 border-white/10",
                cepAutoFilled && formData.company_state && "border-green-500/30"
              )}>
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {BRAZILIAN_STATES.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Inscrição Estadual - full width */}
        <div className="space-y-1.5">
          <Label htmlFor="company_state_registration">Inscrição Estadual (opcional)</Label>
          <Input
            id="company_state_registration"
            value={formData.company_state_registration}
            onChange={(e) => setFormData(prev => ({ ...prev, company_state_registration: e.target.value }))}
            placeholder="ISENTO ou número da inscrição"
            className="bg-white/5 border-white/10"
          />
        </div>
      </div>
    </div>
  );

  // Step 4: Plan Selection
  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Escolha seu Plano
        </h3>
        <p className="text-sm text-muted-foreground">Selecione o plano ideal para sua escola</p>
      </div>

      {loadingPlans ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => {
            const isSelected = formData.plan_id === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, plan_id: plan.id }))}
                className={cn(
                  "relative p-4 rounded-xl border-2 transition-all text-left",
                  isSelected
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                )}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{plan.name}</h4>
                    <p className="text-2xl font-bold text-primary mt-1">
                      {formatCurrency(plan.price_cents)}
                      <span className="text-sm font-normal text-muted-foreground">/mês</span>
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        Até {plan.max_students} alunos
                      </span>
                      <span className="flex items-center gap-1">
                        <School className="w-4 h-4" />
                        {plan.included_schools} escola{plan.included_schools > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedPlan && (
        <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total mensal</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(selectedPlan.price_cents)}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-[length:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-border/30 bg-card/95 backdrop-blur-sm shadow-lg">
          <CardHeader className="text-center space-y-1 px-6 py-6">
            <button
              onClick={() => navigate('/login')}
              className="absolute left-4 top-4 p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center justify-center">
              <img src={klaseLogo} alt="Klase" className="h-12 w-auto" />
            </div>
            <CardTitle className="text-xl">Criar sua conta</CardTitle>
            <CardDescription>Comece a transformar sua escola hoje</CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            {renderStepper()}

            <ScrollArea className="max-h-[calc(65vh-160px)] min-h-[320px] pr-2">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
            </ScrollArea>

            {/* Navigation buttons */}
            <div className="flex justify-between mt-6 pt-4 border-t border-border/30">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Voltar
                </Button>
              ) : (
                <div />
              )}

              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!validateStep(currentStep)}
                  className="gap-2"
                >
                  Próximo
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !validateStep(4)}
                  className="gap-2 bg-gradient-to-r from-primary to-primary/80"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      Assinar e Pagar
                      <CreditCard className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}