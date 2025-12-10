import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputPhone } from '@/components/ui/input-phone';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { supabase } from '@/integrations/supabase/client';
import { validateName, normalizeSpaces } from '@/lib/validation';
import { generateAdminOnboardingPDF } from '@/lib/admin-onboarding-pdf';
import { 
  Loader2, 
  UserPlus, 
  Building2, 
  CreditCard, 
  Copy, 
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  User,
  Mail,
  Phone,
  Key,
  Link,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Sparkles,
  Plus,
  Minus,
  FileText,
  MapPin,
  Building,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface CreateAdministratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FormData {
  // Etapa 1 - Plano
  plan_id: string;
  addon_schools_count: number;
  
  // Etapa 2 - Empresa (opcional)
  company_name: string;
  company_cnpj: string;
  company_address: string;
  company_city: string;
  company_state: string;
  
  // Etapa 3 - Admin + Escola
  name: string;
  email: string;
  phone: string;
  password: string;
  school_name: string;
  school_slug: string;
}

const STEPS = [
  { id: 1, label: 'Admin', icon: User },
  { id: 2, label: 'Empresa', icon: Building },
  { id: 3, label: 'Plano', icon: CreditCard },
  { id: 4, label: 'Revisão', icon: CheckCircle },
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

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

function formatCNPJ(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 14);
  return numbers
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function CreateAdministratorModal({ 
  open, 
  onOpenChange, 
  onSuccess 
}: CreateAdministratorModalProps) {
  const { subscriptionPlans, loadingPlans } = useSuperAdmin();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [autoPassword, setAutoPassword] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  
  const [formData, setFormData] = useState<FormData>({
    plan_id: '',
    addon_schools_count: 0,
    company_name: '',
    company_cnpj: '',
    company_address: '',
    company_city: '',
    company_state: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    school_name: '',
    school_slug: '',
  });

  // Reset ao abrir/fechar
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setFormData(prev => ({
        ...prev,
        password: generatePassword(),
        plan_id: subscriptionPlans?.[0]?.id || '',
      }));
    }
  }, [open, subscriptionPlans]);

  // Auto-gerar slug da escola
  const handleSchoolNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      school_name: name,
      school_slug: generateSlug(name)
    }));
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const regeneratePassword = () => {
    setFormData(prev => ({ ...prev, password: generatePassword() }));
  };

  const selectedPlan = subscriptionPlans?.find(p => p.id === formData.plan_id);
  
  const calculateTotal = () => {
    if (!selectedPlan) return 0;
    const addonCost = formData.addon_schools_count * 49700; // R$497 em centavos
    return selectedPlan.price_cents + addonCost;
  };

  const handlePreviewPDF = async () => {
    try {
      toast.loading('Gerando pré-visualização...');
      
      const pdfData = {
        adminName: formData.name || 'Administrador',
        schoolName: formData.school_name || 'Escola',
        planName: selectedPlan?.name || 'Plano',
        maxStudents: selectedPlan?.max_students || 0,
        email: formData.email || 'email@exemplo.com'
      };
      
      const blob = await generateAdminOnboardingPDF(pdfData);
      
      // Download direto - funciona em todos os navegadores
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `preview-onboarding-${formData.school_slug || 'escola'}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      
      toast.dismiss();
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error('Preview PDF error:', error);
      toast.dismiss();
      toast.error('Erro ao gerar preview');
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: {
        const nameError = validateName(formData.name);
        return !!(formData.name && !nameError && formData.email && formData.password && formData.school_name && formData.school_slug);
      }
      case 2: return true; // Empresa é opcional
      case 3: return !!formData.plan_id;
      case 4: return true;
      default: return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    } else {
      toast.error('Preencha os campos obrigatórios');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(3)) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!slugRegex.test(formData.school_slug)) {
      toast.error('Slug inválido. Use apenas letras minúsculas, números e hífens.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-administrator', {
        body: {
          name: formData.name,
          email: formData.email.toLowerCase(),
          password: formData.password,
          phone: formData.phone || undefined,
          school_name: formData.school_name,
          school_slug: formData.school_slug,
          plan_id: formData.plan_id,
          status: 'active',
          addon_schools_count: formData.addon_schools_count,
          // Dados da empresa (opcionais)
          company_name: formData.company_name || undefined,
          company_cnpj: formData.company_cnpj.replace(/\D/g, '') || undefined,
          company_address: formData.company_address || undefined,
          company_city: formData.company_city || undefined,
          company_state: formData.company_state || undefined,
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Generate onboarding PDF
      let onboardingPdfUrl: string | undefined;
      try {
        const pdfBlob = await generateAdminOnboardingPDF({
          adminName: formData.name,
          schoolName: formData.school_name,
          planName: selectedPlan?.name || 'Plano',
          maxStudents: selectedPlan?.max_students || 0,
          email: formData.email.toLowerCase(),
        });
        
        // Upload PDF to Supabase Storage
        const fileName = `onboarding_${formData.school_slug}_${Date.now()}.pdf`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('onboarding-pdfs')
          .upload(fileName, pdfBlob, {
            contentType: 'application/pdf',
            upsert: false,
          });
        
        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from('onboarding-pdfs')
            .getPublicUrl(uploadData.path);
          onboardingPdfUrl = urlData?.publicUrl;
        }
      } catch (pdfError) {
        console.error('Failed to generate/upload PDF:', pdfError);
        // Continue without PDF
      }

      // Send welcome email if checked
      if (sendWelcomeEmail) {
        try {
          await supabase.functions.invoke('send-admin-welcome-email', {
            body: {
              adminName: formData.name,
              adminEmail: formData.email.toLowerCase(),
              password: formData.password,
              schoolName: formData.school_name,
              planName: selectedPlan?.name,
              maxStudents: selectedPlan?.max_students,
              isPasswordReset: false,
              onboardingPdfUrl,
            }
          });
          toast.success(`Administrador ${formData.name} criado e email enviado!`);
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          toast.success(`Administrador ${formData.name} criado com sucesso!`);
          toast.warning('Falha ao enviar email de boas-vindas');
        }
      } else {
        toast.success(`Administrador ${formData.name} criado com sucesso!`);
      }
      
      // Reset form
      setFormData({
        plan_id: subscriptionPlans?.[0]?.id || '',
        addon_schools_count: 0,
        company_name: '',
        company_cnpj: '',
        company_address: '',
        company_city: '',
        company_state: '',
        name: '',
        email: '',
        phone: '',
        password: generatePassword(),
        school_name: '',
        school_slug: '',
      });
      setCurrentStep(1);
      setSendWelcomeEmail(true);
      
      onSuccess();
    } catch (error: any) {
      console.error('Error creating administrator:', error);
      toast.error(error.message || 'Erro ao criar administrador');
    } finally {
      setLoading(false);
    }
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

  // Etapa 1: Admin + Escola
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Administrador & Escola
        </h3>
        <p className="text-sm text-muted-foreground">Dados de acesso e escola inicial</p>
      </div>

      {/* Dados do Admin */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <User className="w-4 h-4 text-primary" />
          Administrador
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => {
              const sanitized = e.target.value.replace(/[0-9]/g, '');
              setFormData(prev => ({ ...prev, name: sanitized }));
              if (fieldErrors.name) {
                setFieldErrors(prev => ({ ...prev, name: '' }));
              }
            }}
            onBlur={() => {
              const normalized = normalizeSpaces(formData.name);
              setFormData(prev => ({ ...prev, name: normalized }));
              const error = validateName(normalized);
              if (error) {
                setFieldErrors(prev => ({ ...prev, name: error }));
              }
            }}
            placeholder="Nome do administrador"
            className={cn(
              "bg-white/5 border-white/10",
              fieldErrors.name && "border-destructive"
            )}
          />
          {fieldErrors.name && (
            <p className="text-sm text-destructive">{fieldErrors.name}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
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
                className="bg-white/5 border-white/10 pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Credenciais */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Key className="w-4 h-4 text-primary" />
          Credenciais de Acesso
        </div>

        <div className="flex items-center gap-2">
          <Checkbox 
            id="auto-password" 
            checked={autoPassword}
            onCheckedChange={(checked) => {
              setAutoPassword(!!checked);
              if (checked) {
                setFormData(prev => ({ ...prev, password: generatePassword() }));
              }
            }}
          />
          <Label htmlFor="auto-password" className="text-sm cursor-pointer">
            Gerar senha automática (recomendado)
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha *</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Mínimo 8 caracteres"
                className="bg-white/5 border-white/10 pr-20"
                readOnly={autoPassword}
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
            {autoPassword && (
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={regeneratePassword}
                className="bg-white/5 border-white/10 shrink-0"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Escola */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Building2 className="w-4 h-4 text-primary" />
          Escola Principal
        </div>

        <div className="space-y-2">
          <Label htmlFor="school_name">Nome da Escola *</Label>
          <Input
            id="school_name"
            value={formData.school_name}
            onChange={(e) => handleSchoolNameChange(e.target.value)}
            placeholder="Ex: Colégio Exemplo"
            className="bg-white/5 border-white/10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="school_slug">Slug (URL) *</Label>
          <div className="relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="school_slug"
              value={formData.school_slug}
              onChange={(e) => setFormData(prev => ({ ...prev, school_slug: e.target.value.toLowerCase() }))}
              placeholder="colegio-exemplo"
              className="bg-white/5 border-white/10 pl-9"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            URL: <span className="text-primary">/{formData.school_slug || 'slug'}</span>
          </p>
        </div>
      </div>
    </div>
  );

  // Etapa 2: Empresa (opcional)
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
          <Building className="w-5 h-5 text-primary" />
          Dados da Empresa
        </h3>
        <p className="text-sm text-muted-foreground">Informações opcionais para faturamento</p>
      </div>

      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200">
        💡 Estes dados são opcionais e facilitam a emissão de notas fiscais e contratos.
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company_name">Razão Social</Label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
              placeholder="Nome da empresa"
              className="bg-white/5 border-white/10 pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_cnpj">CNPJ</Label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="company_cnpj"
              value={formData.company_cnpj}
              onChange={(e) => setFormData(prev => ({ ...prev, company_cnpj: formatCNPJ(e.target.value) }))}
              placeholder="00.000.000/0000-00"
              className="bg-white/5 border-white/10 pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_address">Endereço</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="company_address"
              value={formData.company_address}
              onChange={(e) => setFormData(prev => ({ ...prev, company_address: e.target.value }))}
              placeholder="Rua, número, complemento"
              className="bg-white/5 border-white/10 pl-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company_city">Cidade</Label>
            <Input
              id="company_city"
              value={formData.company_city}
              onChange={(e) => setFormData(prev => ({ ...prev, company_city: e.target.value }))}
              placeholder="Cidade"
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_state">Estado</Label>
            <Select
              value={formData.company_state}
              onValueChange={(value) => setFormData(prev => ({ ...prev, company_state: value }))}
            >
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-white/10 z-50">
                {BRAZILIAN_STATES.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );

  // Etapa 3: Plano
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Escolha o Plano
        </h3>
        <p className="text-sm text-muted-foreground">Selecione o plano ideal para o cliente</p>
      </div>

      {/* Cards de planos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {loadingPlans ? (
          <div className="col-span-3 flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          subscriptionPlans?.map((plan) => {
            const isSelected = formData.plan_id === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, plan_id: plan.id }))}
                className={cn(
                  "relative p-4 rounded-lg border-2 transition-all text-left",
                  isSelected 
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                    : "border-white/10 bg-white/5 hover:border-white/20"
                )}
              >
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div className="font-bold text-base mb-1">{plan.name}</div>
                <div className="text-xl font-bold text-primary">
                  {formatCurrency(plan.price_cents)}
                  <span className="text-xs font-normal text-muted-foreground">/mês</span>
                </div>
                <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                  <div>• {plan.max_students} alunos</div>
                  <div>• {plan.included_schools} escola incluída</div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Escolas adicionais */}
      <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">Escolas Adicionais</div>
            <div className="text-xs text-muted-foreground">+R$497,00/mês cada</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-white/5 border-white/10"
              onClick={() => setFormData(prev => ({ ...prev, addon_schools_count: Math.max(0, prev.addon_schools_count - 1) }))}
              disabled={formData.addon_schools_count === 0}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="w-8 text-center font-bold">{formData.addon_schools_count}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-white/5 border-white/10"
              onClick={() => setFormData(prev => ({ ...prev, addon_schools_count: prev.addon_schools_count + 1 }))}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
        <div className="flex items-center justify-between">
          <span className="font-medium">Total Mensal</span>
          <span className="text-2xl font-bold text-primary">{formatCurrency(calculateTotal())}</span>
        </div>
        {formData.addon_schools_count > 0 && selectedPlan && (
          <div className="text-xs text-muted-foreground mt-1">
            {formatCurrency(selectedPlan.price_cents)} (plano) + {formatCurrency(formData.addon_schools_count * 49700)} ({formData.addon_schools_count} escola{formData.addon_schools_count > 1 ? 's' : ''} extra)
          </div>
        )}
      </div>
    </div>
  );

  // Etapa 4: Revisão
  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary" />
          Revisão Final
        </h3>
        <p className="text-sm text-muted-foreground">Confirme os dados antes de criar</p>
      </div>

      {/* Plano */}
      <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CreditCard className="w-4 h-4 text-primary" />
          Plano
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Plano:</div>
          <div className="font-medium">{selectedPlan?.name}</div>
          <div className="text-muted-foreground">Capacidade:</div>
          <div>{selectedPlan?.max_students} alunos</div>
          <div className="text-muted-foreground">Escolas:</div>
          <div>{(selectedPlan?.included_schools || 1) + formData.addon_schools_count} ({selectedPlan?.included_schools} + {formData.addon_schools_count} extra)</div>
          <div className="text-muted-foreground">Status:</div>
          <div>Ativo</div>
          <div className="text-muted-foreground">Total Mensal:</div>
          <div className="font-bold text-primary">{formatCurrency(calculateTotal())}</div>
        </div>
      </div>

      {/* Empresa */}
      {formData.company_name && (
        <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Building className="w-4 h-4 text-primary" />
            Empresa
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Razão Social:</div>
            <div>{formData.company_name}</div>
            {formData.company_cnpj && (
              <>
                <div className="text-muted-foreground">CNPJ:</div>
                <div>{formData.company_cnpj}</div>
              </>
            )}
            {formData.company_city && (
              <>
                <div className="text-muted-foreground">Cidade:</div>
                <div>{formData.company_city}/{formData.company_state}</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Admin */}
      <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <User className="w-4 h-4 text-primary" />
          Administrador
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Nome:</div>
          <div>{formData.name}</div>
          <div className="text-muted-foreground">Email:</div>
          <div>{formData.email}</div>
          {formData.phone && (
            <>
              <div className="text-muted-foreground">Telefone:</div>
              <div>{formData.phone}</div>
            </>
          )}
          <div className="text-muted-foreground">Senha:</div>
          <div className="flex items-center gap-2">
            <span>{showPassword ? formData.password : '••••••••••••'}</span>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={() => handleCopy(formData.password, 'review-password')}
            >
              {copiedField === 'review-password' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Escola */}
      <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Building2 className="w-4 h-4 text-primary" />
          Escola
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Nome:</div>
          <div>{formData.school_name}</div>
          <div className="text-muted-foreground">URL:</div>
          <div className="text-primary">/{formData.school_slug}</div>
        </div>
      </div>

      {/* Email de Boas-Vindas */}
      <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Mail className="w-4 h-4 text-primary" />
          Notificação
        </div>
        <div className="flex items-center gap-3">
          <Checkbox
            id="sendWelcomeEmail"
            checked={sendWelcomeEmail}
            onCheckedChange={(checked) => setSendWelcomeEmail(checked as boolean)}
          />
          <Label htmlFor="sendWelcomeEmail" className="text-sm cursor-pointer">
            Enviar email de boas-vindas com credenciais
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          O administrador receberá um email profissional com login, senha e informações do plano.
        </p>
      </div>

      {/* Pré-visualizar PDF */}
      <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText className="w-4 h-4 text-primary" />
          Kit de Implantação
        </div>
        <p className="text-xs text-muted-foreground">
          Visualize como ficará o PDF de onboarding que será enviado ao administrador.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePreviewPDF}
          className="w-full bg-white/5 border-white/10 hover:bg-white/10 gap-2"
        >
          <Download className="w-4 h-4" />
          Baixar Pré-visualização do PDF
        </Button>
      </div>

      {/* Aviso */}
      <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm">
        ⚠️ Após criar, o Kit de Implantação será gerado automaticamente.
        <br />
        <span className="text-muted-foreground">Suporte: lucas@klasetech.com</span>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl glass-card border-white/10 max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="w-5 h-5 text-primary" />
            Novo Administrador
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6">
          <div className="py-4">
            {renderStepper()}
            
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t border-white/10 gap-2 flex-col sm:flex-row">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              className="bg-white/5 border-white/10"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
          )}
          
          {currentStep === 2 && (
            <Button
              type="button"
              variant="ghost"
              onClick={nextStep}
              className="text-muted-foreground"
            >
              Pular
            </Button>
          )}

          <div className="flex-1" />

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-white/5 border-white/10"
          >
            Cancelar
          </Button>

          {currentStep < 4 ? (
            <Button
              type="button"
              onClick={nextStep}
              disabled={!validateStep(currentStep)}
              className="gap-1"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Criar Administrador
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
