import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputPhone } from '@/components/ui/input-phone';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, Eye, EyeOff, Shield, Info } from 'lucide-react';
import { SecretariaFormData, Secretaria } from '@/types/secretaria';
import {
  validateName, 
  validateEmail, 
  validatePassword, 
  validatePhone,
  generateSecurePassword,
  normalizeSpaces 
} from '@/lib/validation';
import { CredentialsDialog } from '@/components/students/CredentialsDialog';
import { toast } from 'sonner';

interface SecretariaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SecretariaFormData) => Promise<boolean>;
  secretaria?: Secretaria | null;
  onUpdate?: (id: string, updates: Partial<SecretariaFormData>) => Promise<boolean>;
}

export function SecretariaFormModal({ 
  open, 
  onOpenChange, 
  onSubmit,
  secretaria,
  onUpdate
}: SecretariaFormModalProps) {
  const isEditing = Boolean(secretaria);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  const [formData, setFormData] = useState<SecretariaFormData>({
    name: '',
    email: '',
    password: '',
    phone: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Credenciais para exibir após criação
  const [showCredentials, setShowCredentials] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    name: string;
  } | null>(null);

  // Auto-gerar senha quando o modal abrir ou carregar dados para edição
  useEffect(() => {
    if (open) {
      if (secretaria) {
        // Modo de edição: carregar dados
        setFormData({
          name: secretaria.name || '',
          email: secretaria.email || '',
          password: '',
          phone: secretaria.phone || ''
        });
      } else {
        // Modo de criação: gerar nova senha
        const newPassword = generateSecurePassword();
        setFormData(prev => ({ ...prev, password: newPassword }));
      }
      
      // Limpar erros e touched
      setErrors({});
      setTouched({});
      
      // Auto-focus no primeiro campo
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [open, secretaria]);

  // Regenerar senha
  const handleRegeneratePassword = () => {
    const newPassword = generateSecurePassword();
    setFormData(prev => ({ ...prev, password: newPassword }));
    
    toast.success('Nova senha gerada');
  };

  // Validar campo individual
  const validateField = (field: string): string | null => {
    switch (field) {
      case 'name':
        return validateName(formData.name);
      case 'email':
        return validateEmail(formData.email);
      case 'password':
        return validatePassword(formData.password);
      case 'phone':
        return formData.phone ? validatePhone(formData.phone) : null;
      default:
        return null;
    }
  };

  // Marcar campo como tocado e validar
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    const error = validateField(field);
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  // Limpar erro durante digitação
  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpa erro se campo foi tocado
    if (touched[field] && errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Normalizar campos antes de validar e enviar
    const normalizedData = {
      ...formData,
      name: normalizeSpaces(formData.name),
      email: formData.email.trim(),
      phone: formData.phone.trim()
    };
    
    setFormData(normalizedData);
    
    // Marcar todos como tocados
    setTouched({
      name: true,
      email: true,
      password: true,
      phone: true
    });

    // Validar todos os campos
    const fieldErrors: Record<string, string> = {};
    
    const nameError = validateName(normalizedData.name);
    if (nameError) fieldErrors.name = nameError;
    
    const emailError = validateEmail(normalizedData.email);
    if (emailError) fieldErrors.email = emailError;
    
    const passwordError = validatePassword(normalizedData.password);
    if (passwordError) fieldErrors.password = passwordError;
    
    if (normalizedData.phone) {
      const phoneError = validatePhone(normalizedData.phone);
      if (phoneError) fieldErrors.phone = phoneError;
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      toast.error('Verifique os campos destacados');
      return;
    }

    setLoading(true);
    
    try {
      const success = await onSubmit(formData);
      
      if (success) {
        // Salvar credenciais para exibir
        setCreatedCredentials({
          name: formData.name,
          email: formData.email,
          password: formData.password
        });
        setShowCredentials(true);
        
        toast.success(`${formData.name} foi cadastrada no sistema`);
      } else {
        toast.error('Erro ao criar secretaria');
      }
    } catch (error: any) {
      // Tratar erros específicos
      if (error?.message?.includes('email')) {
        toast.error('Email já cadastrado no sistema');
        setErrors(prev => ({ ...prev, email: 'Email já cadastrado' }));
      } else {
        toast.error(error?.message || 'Erro ao criar secretaria');
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset completo ao fechar
  const handleClose = () => {
    setFormData({ name: '', email: '', password: '', phone: '' });
    setErrors({});
    setTouched({});
    setShowPassword(false);
    onOpenChange(false);
  };

  // Fechar tudo após ver credenciais
  const handleCredentialsClose = (isOpen: boolean) => {
    setShowCredentials(isOpen);
    if (!isOpen) {
      handleClose();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {isEditing ? 'Editar Secretária' : 'Nova Secretaria'}
            </DialogTitle>
          </DialogHeader>

          {/* Aviso de Segurança */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-blue-600 dark:text-blue-400">
                <strong>Importante:</strong> Como administrador, você está criando uma 
                conta com permissões de secretaria. As credenciais serão exibidas apenas uma vez.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome Completo */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                ref={nameInputRef}
                id="name"
                value={formData.name}
                onChange={(e) => {
                  // Permite espaços durante digitação, apenas limita tamanho
                  handleFieldChange('name', e.target.value);
                }}
                onBlur={() => {
                  // Normalizar antes de validar
                  setFormData(prev => ({ ...prev, name: normalizeSpaces(prev.name) }));
                  handleBlur('name');
                }}
                placeholder="Ex: Maria Silva Santos"
                disabled={loading}
                maxLength={100}
                className={errors.name && touched.name ? 'border-destructive' : ''}
              />
              {errors.name && touched.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Email Institucional */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Institucional *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  // Apenas lowercase, sem trim
                  const email = e.target.value.toLowerCase();
                  handleFieldChange('email', email);
                }}
                onBlur={() => {
                  // Trim antes de validar
                  setFormData(prev => ({ ...prev, email: prev.email.trim() }));
                  handleBlur('email');
                }}
                placeholder="Ex: maria.silva@escola.com.br"
                disabled={loading}
                maxLength={255}
                autoComplete="off"
                className={errors.email && touched.email ? 'border-destructive' : ''}
              />
              {errors.email && touched.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Este será o login da secretaria no sistema
              </p>
            </div>

            {/* Senha */}
            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                      onBlur={() => handleBlur('password')}
                      className={`pr-10 font-mono ${errors.password && touched.password ? 'border-destructive' : ''}`}
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleRegeneratePassword}
                    disabled={loading}
                    title="Gerar nova senha"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                {errors.password && touched.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Senha gerada automaticamente. Clique em <RefreshCw className="inline h-3 w-3" /> para gerar nova.
                </p>
              </div>
            )}

            {/* Telefone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (opcional)</Label>
              <InputPhone
                id="phone"
                value={formData.phone}
                onChange={(value) => handleFieldChange('phone', value)}
                error={touched.phone ? errors.phone : null}
                showError={false}
                disabled={loading}
              />
              {errors.phone && touched.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Formato: (11) 99999-9999
              </p>
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Salvando...' : 'Criando...'}
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    {isEditing ? 'Salvar Alterações' : 'Criar Secretaria'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Credenciais */}
      <CredentialsDialog
        open={showCredentials}
        onOpenChange={handleCredentialsClose}
        name={createdCredentials?.name || ''}
        email={createdCredentials?.email || ''}
        password={createdCredentials?.password || ''}
        role="secretaria"
      />
    </>
  );
}
