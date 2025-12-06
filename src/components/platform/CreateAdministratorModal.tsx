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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { supabase } from '@/integrations/supabase/client';
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
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CreateAdministratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

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
  // Garantir pelo menos um de cada tipo
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Completar com caracteres aleatórios
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  // Embaralhar
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

export function CreateAdministratorModal({ 
  open, 
  onOpenChange, 
  onSuccess 
}: CreateAdministratorModalProps) {
  const { subscriptionPlans, loadingPlans } = useSuperAdmin();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [autoPassword, setAutoPassword] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isTrial, setIsTrial] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    school_name: '',
    school_slug: '',
    plan_id: '',
    trial_days: 14,
  });

  // Gerar senha automaticamente ao abrir
  useEffect(() => {
    if (open && autoPassword) {
      setFormData(prev => ({ ...prev, password: generatePassword() }));
    }
  }, [open, autoPassword]);

  // Definir plano padrão quando carregar
  useEffect(() => {
    if (subscriptionPlans?.length && !formData.plan_id) {
      setFormData(prev => ({ ...prev, plan_id: subscriptionPlans[0].id }));
    }
  }, [subscriptionPlans, formData.plan_id]);

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

  const handleCopyCredentials = async () => {
    const text = `Email: ${formData.email}\nSenha: ${formData.password}`;
    await navigator.clipboard.writeText(text);
    toast.success('Credenciais copiadas!');
  };

  const regeneratePassword = () => {
    setFormData(prev => ({ ...prev, password: generatePassword() }));
  };

  const selectedPlan = subscriptionPlans?.find(p => p.id === formData.plan_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password || 
        !formData.school_name || !formData.school_slug || !formData.plan_id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Validar slug
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
          status: isTrial ? 'trial' : 'active',
          trial_days: isTrial ? formData.trial_days : undefined,
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success(`Administrador ${formData.name} criado com sucesso!`);
      
      // Resetar form
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: generatePassword(),
        school_name: '',
        school_slug: '',
        plan_id: subscriptionPlans?.[0]?.id || '',
        trial_days: 14,
      });
      setIsTrial(false);
      
      onSuccess();
    } catch (error: any) {
      console.error('Error creating administrator:', error);
      toast.error(error.message || 'Erro ao criar administrador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl glass-card border-white/10 max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="w-5 h-5 text-primary" />
            Novo Administrador
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            {/* Dados do Administrador */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <User className="w-4 h-4 text-primary" />
                Dados do Administrador
              </div>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do administrador"
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
                      placeholder="email@exemplo.com"
                      className="bg-white/5 border-white/10 pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(00) 00000-0000"
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
                Escola Inicial
              </div>

              <div className="grid gap-4">
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

            {/* Plano */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CreditCard className="w-4 h-4 text-primary" />
                Plano de Assinatura
              </div>

              <div className="space-y-2">
                <Label>Plano *</Label>
                <Select 
                  value={formData.plan_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, plan_id: value }))}
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingPlans ? (
                      <SelectItem value="loading" disabled>Carregando...</SelectItem>
                    ) : (
                      subscriptionPlans?.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - {formatCurrency(plan.price_cents)}/mês
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedPlan && (
                  <p className="text-xs text-muted-foreground">
                    {selectedPlan.max_students} alunos • {selectedPlan.included_schools} escola incluída
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="is-trial" 
                  checked={isTrial}
                  onCheckedChange={(checked) => setIsTrial(!!checked)}
                />
                <Label htmlFor="is-trial" className="text-sm cursor-pointer flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Iniciar em período Trial
                </Label>
              </div>

              {isTrial && (
                <div className="space-y-2 ml-6">
                  <Label htmlFor="trial_days">Dias de Trial</Label>
                  <Input
                    id="trial_days"
                    type="number"
                    min="1"
                    max="90"
                    value={formData.trial_days}
                    onChange={(e) => setFormData(prev => ({ ...prev, trial_days: parseInt(e.target.value) || 14 }))}
                    className="bg-white/5 border-white/10 w-32"
                  />
                </div>
              )}
            </div>

            {/* Resumo */}
            {formData.name && formData.email && formData.school_name && selectedPlan && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <AlertTriangle className="w-4 h-4" />
                  Resumo
                </div>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p><strong>Admin:</strong> {formData.name} ({formData.email})</p>
                  <p><strong>Escola:</strong> {formData.school_name} (/{formData.school_slug})</p>
                  <p>
                    <strong>Plano:</strong> {selectedPlan.name} - {formatCurrency(selectedPlan.price_cents)}/mês
                    {isTrial && ` (Trial ${formData.trial_days} dias)`}
                  </p>
                </div>
              </div>
            )}
          </form>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t border-white/10 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => formData.email && formData.password && handleCopyCredentials()}
            disabled={!formData.email || !formData.password}
            className="bg-white/5 border-white/10 mr-auto"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copiar Credenciais
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-white/5 border-white/10"
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Criar Administrador
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
