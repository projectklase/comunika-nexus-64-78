import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { InputPhone } from '@/components/ui/input-phone';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  Plus,
  Trash2,
  User,
  Phone,
  GraduationCap,
  Users,
  Heart,
  CheckCircle,
  Copy,
  RefreshCw,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  validatePhone, 
  validateName, 
  validateEmail, 
  validateCPF, 
  validateEnrollmentNumber,
  validateZipCode,
  sanitizeString,
  normalizeSpaces,
  onlyDigits,
  generateSecurePassword
} from '@/lib/validation';
import { Person, Guardian, StudentExtra } from '@/types/class';
import { useClasses } from '@/hooks/useClasses';
import { usePrograms } from '@/hooks/usePrograms';
import { useLevels } from '@/hooks/useLevels';
import { useStudents } from '@/hooks/useStudents';
import { supabase } from '@/integrations/supabase/client';
import { CredentialsDialog } from './CredentialsDialog';

interface StudentFormStepsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Person | null;
  onSave: () => void;
}

const STEPS = [
  { id: 1, title: 'Dados Pessoais', icon: User },
  { id: 2, title: 'Contato & Endereço', icon: Phone },
  { id: 3, title: 'Acadêmico', icon: GraduationCap },
  { id: 4, title: 'Responsável', icon: Users },
  { id: 5, title: 'Saúde & Autorizações', icon: Heart },
  { id: 6, title: 'Revisão', icon: CheckCircle },
];

const RELATION_OPTIONS = [
  { value: 'MAE', label: 'Mãe' },
  { value: 'PAI', label: 'Pai' },
  { value: 'RESPONSAVEL', label: 'Responsável' },
  { value: 'TUTOR', label: 'Tutor' },
  { value: 'OUTRO', label: 'Outro' },
] as const;

export function StudentFormSteps({ open, onOpenChange, student, onSave }: StudentFormStepsProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Person & { student: StudentExtra }>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCredentials, setShowCredentials] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    name: string;
  } | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  const { classes } = useClasses();
  const { programs } = usePrograms();
  const { levels } = useLevels();
  const { createStudent, updateStudent } = useStudents();

  useEffect(() => {
    if (open) {
      if (student) {
        setFormData({
          ...student,
          student: student.student || {}
        });
      } else {
        setFormData({
          name: '',
          email: '',
          role: 'ALUNO',
          student: {
            dob: undefined,
            phones: [''],
            email: '',
          address: {
            street: '',
            number: '',
            district: '',
            city: '',
            state: '',
            zip: ''
          },
          guardians: [{
            id: crypto.randomUUID(),
            name: '',
            relation: 'MAE' as const,
            phone: '',
            email: '',
            isPrimary: true
          }],
          enrollmentNumber: '',
          programId: undefined,
          levelId: undefined,
          classIds: [],
          healthNotes: '',
          consents: {
            image: false,
            fieldTrip: false,
            whatsapp: false
          }
        }
      });
      }
      setCurrentStep(1);
      setErrors({});
      setGeneratedPassword('');
      setShowResetPassword(false);
    }
  }, [open, student]);

  // Gera senha automaticamente quando chega no step 6 (revisão) para novos alunos
  useEffect(() => {
    if (currentStep === 6 && !student && !generatedPassword) {
      const newPassword = generateSecurePassword();
      setGeneratedPassword(newPassword);
    }
  }, [currentStep, student, generatedPassword]);

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({
      ...prev,
      ...updates,
      student: {
        ...prev.student,
        ...updates.student
      }
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Dados Pessoais
        if (!formData.name?.trim()) {
          newErrors.name = 'Nome é obrigatório';
        } else {
          const nameValidation = validateName(formData.name);
          if (nameValidation) {
            newErrors.name = nameValidation;
          }
        }

        if (formData.student?.dob) {
          const birthDate = new Date(formData.student.dob);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          if (age > 120 || age < 0) {
            newErrors.dob = 'Data de nascimento inválida';
          }
        }
        break;

      case 2: // Contato & Endereço
        if (formData.student?.email) {
          const emailValidation = validateEmail(formData.student.email);
          if (emailValidation) {
            newErrors.email = emailValidation;
          }
        }

        formData.student?.phones?.forEach((phone, index) => {
          if (phone && validatePhone(phone)) {
            newErrors[`phone${index}`] = validatePhone(phone) || 'Telefone inválido';
          }
        });

        if (formData.student?.address?.zip) {
          const zipValidation = validateZipCode(formData.student.address.zip);
          if (zipValidation) {
            newErrors.zipCode = zipValidation;
          }
        }
        break;

      case 3: // Acadêmico
        if (!formData.student?.email) {
          newErrors.studentEmail = 'Email é obrigatório para criar login';
        }
        break;

      case 4: // Responsável
        const isMinor = formData.student?.dob ? 
          (new Date().getFullYear() - new Date(formData.student.dob).getFullYear()) < 18 : 
          true;

        if (isMinor) {
          if (!formData.student?.guardians?.length || 
              !formData.student.guardians.some(g => g.name.trim())) {
            newErrors.guardians = 'Ao menos um responsável é obrigatório para menores';
          }
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 6));
    } else {
      toast.error('Preencha os campos obrigatórios corretamente');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const addGuardian = () => {
    const guardians = formData.student?.guardians || [];
    updateFormData({
      student: {
        guardians: [
          ...guardians,
          {
            id: crypto.randomUUID(),
            name: '',
            relation: 'RESPONSAVEL' as const,
            phone: '',
            email: '',
            isPrimary: false
          }
        ]
      }
    });
  };

  const removeGuardian = (index: number) => {
    const guardians = [...(formData.student?.guardians || [])];
    guardians.splice(index, 1);
    updateFormData({ student: { guardians } });
  };

  const updateGuardian = (index: number, updates: Partial<Guardian>) => {
    const guardians = [...(formData.student?.guardians || [])];
    guardians[index] = { ...guardians[index], ...updates };
    updateFormData({ student: { guardians } });
  };

  const handleResetPassword = () => {
    const newPassword = generateSecurePassword();
    setGeneratedPassword(newPassword);
    setShowResetPassword(true);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const studentEmail = formData.student?.email;
      if (!studentEmail) {
        throw new Error("O email do aluno é obrigatório para criar o login.");
      }

      let studentId = student?.id;

      if (!student) {
        // Criando novo aluno - usa a senha gerada automaticamente
        const result = await createStudent({
          name: formData.name || '',
          email: studentEmail,
          password: generatedPassword,
          dob: formData.student?.dob,
          phone: formData.student?.phones?.[0],
          enrollment_number: formData.student?.enrollmentNumber,
        });
        
        if (result?.password) {
          setCreatedCredentials({
            email: studentEmail,
            password: result.password,
            name: formData.name || '',
          });
          setShowCredentials(true);
        }
        
        studentId = result?.user?.id;
      } else {
        // Atualizando aluno existente
        const updateData: any = {
          name: formData.name?.trim(),
          email: studentEmail,
          dob: formData.student?.dob,
          phone: formData.student?.phones?.[0],
          enrollment_number: formData.student?.enrollmentNumber,
        };

        // Se resetou a senha, inclui no update
        if (showResetPassword && generatedPassword) {
          updateData.password = generatedPassword;
        }
        
        const result = await updateStudent(studentId, updateData);
        
        // Se resetou a senha, mostra as credenciais
        if (showResetPassword && generatedPassword && result?.password) {
          setCreatedCredentials({
            name: formData.name || '',
            email: studentEmail,
            password: generatedPassword
          });
          setShowCredentials(true);
        }
      }

      if (!studentId) {
        throw new Error("Não foi possível obter o ID do aluno.");
      }

      // Salvar relacionamentos de turmas
      if (formData.student?.classIds && formData.student.classIds.length > 0) {
        // Remove relacionamentos existentes
        await supabase
          .from('class_students')
          .delete()
          .eq('student_id', studentId);

        // Adiciona novos relacionamentos
        const classStudents = formData.student.classIds.map(classId => ({
          class_id: classId,
          student_id: studentId
        }));

        await supabase
          .from('class_students')
          .insert(classStudents);
      }

      // Salvar guardiões
      if (formData.student?.guardians && formData.student.guardians.length > 0) {
        await supabase
          .from('guardians')
          .delete()
          .eq('student_id', studentId);

        const validGuardians = formData.student.guardians
          .filter(g => g.name.trim())
          .map(g => ({
            student_id: studentId,
            name: g.name,
            relation: g.relation,
            phone: g.phone || null,
            email: g.email || null,
            is_primary: g.isPrimary || false
          }));

        if (validGuardians.length > 0) {
          await supabase
            .from('guardians')
            .insert(validGuardians);
        }
      }

      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar aluno:', error);
      toast.error(error.message || 'Erro ao salvar aluno');
    } finally {
      setLoading(false);
    }
  };

  const isStudentMinor = formData.student?.dob ? 
    (new Date().getFullYear() - new Date(formData.student.dob).getFullYear()) < 18 : 
    true;

  const currentStepIndex = currentStep - 1;
  const isLastStep = currentStep === STEPS.length;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => {
                  const sanitized = sanitizeString(e.target.value, 100);
                  updateFormData({ name: sanitized });
                  if (errors.name) {
                    const validation = validateName(sanitized);
                    if (!validation) {
                      setErrors(prev => {
                        const { name, ...rest } = prev;
                        return rest;
                      });
                    }
                  }
                }}
                placeholder="Nome completo do aluno"
                maxLength={100}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.name?.length || 0}/100 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">Data de Nascimento</Label>
              <Input
                id="dob"
                value={formData.student?.dob ? format(new Date(formData.student.dob), "dd/MM/yyyy") : ''}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '');
                  
                  // Aplica máscara DD/MM/YYYY
                  if (value.length >= 2) {
                    value = value.slice(0, 2) + '/' + value.slice(2);
                  }
                  if (value.length >= 5) {
                    value = value.slice(0, 5) + '/' + value.slice(5, 9);
                  }
                  
                  // Tenta converter para ISO quando completo
                  if (value.length === 10) {
                    const [day, month, year] = value.split('/');
                    const dayNum = parseInt(day, 10);
                    const monthNum = parseInt(month, 10);
                    const yearNum = parseInt(year, 10);
                    
                    // Validação básica
                    if (dayNum >= 1 && dayNum <= 31 && 
                        monthNum >= 1 && monthNum <= 12 && 
                        yearNum >= 1900 && yearNum <= new Date().getFullYear()) {
                      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                      updateFormData({ student: { dob: isoDate } });
                      
                      // Limpa erro se havia
                      if (errors.dob) {
                        setErrors(prev => {
                          const { dob, ...rest } = prev;
                          return rest;
                        });
                      }
                    }
                  } else if (value.length < 10) {
                    // Ainda está digitando, limpa a data
                    updateFormData({ student: { dob: undefined } });
                  }
                }}
                placeholder="DD/MM/AAAA"
                maxLength={10}
                className={errors.dob ? 'border-destructive' : ''}
              />
              {formData.student?.dob && isStudentMinor && (
                <Badge variant="secondary">Menor de idade</Badge>
              )}
              {errors.dob && (
                <p className="text-sm text-destructive">{errors.dob}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="document">CPF</Label>
              <Input
                id="document"
                value={formData.student?.document || ''}
                onChange={(e) => {
                  const digits = onlyDigits(e.target.value);
                  const formatted = digits.length <= 11 ? 
                    digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') :
                    digits.slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                  
                  updateFormData({ 
                    student: { document: formatted }
                  });
                }}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Telefones</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const phones = formData.student?.phones || [''];
                    updateFormData({ 
                      student: { phones: [...phones, ''] }
                    });
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Telefone
                </Button>
              </div>

              {(formData.student?.phones || ['']).map((phone, index) => (
                <div key={index} className="flex gap-2">
                  <InputPhone
                    value={phone}
                    onChange={(value) => {
                      const phones = [...(formData.student?.phones || [''])];
                      phones[index] = value;
                      updateFormData({ student: { phones } });
                    }}
                    placeholder="(00) 00000-0000"
                  />
                  {(formData.student?.phones?.length || 0) > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const phones = [...(formData.student?.phones || [''])];
                        phones.splice(index, 1);
                        updateFormData({ student: { phones } });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentEmail">Email *</Label>
              <Input
                id="studentEmail"
                type="email"
                value={formData.student?.email || ''}
                onChange={(e) => {
                  const sanitized = sanitizeString(e.target.value, 255).toLowerCase();
                  updateFormData({ 
                    student: { email: sanitized }
                  });
                }}
                placeholder="aluno@email.com"
                maxLength={255}
                className={errors.studentEmail || errors.email ? 'border-destructive' : ''}
              />
              {(errors.studentEmail || errors.email) && (
                <p className="text-sm text-destructive">{errors.studentEmail || errors.email}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Este email será usado para login no sistema
              </p>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Endereço</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input
                    value={formData.student?.address?.zip || ''}
                    onChange={(e) => {
                      const digits = onlyDigits(e.target.value);
                      const formatted = digits.slice(0, 8).replace(/(\d{5})(\d{3})/, '$1-$2');
                      updateFormData({ 
                        student: { 
                          address: { 
                            ...formData.student?.address,
                            zip: formatted 
                          } 
                        }
                      });
                    }}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rua</Label>
                  <Input
                    value={formData.student?.address?.street || ''}
                    onChange={(e) => updateFormData({ 
                      student: { 
                        address: { 
                          ...formData.student?.address,
                          street: sanitizeString(e.target.value, 200)
                        } 
                      }
                    })}
                    placeholder="Nome da rua"
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input
                    value={formData.student?.address?.number || ''}
                    onChange={(e) => updateFormData({ 
                      student: { 
                        address: { 
                          ...formData.student?.address,
                          number: sanitizeString(e.target.value, 10)
                        } 
                      }
                    })}
                    placeholder="123"
                    maxLength={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input
                    value={formData.student?.address?.district || ''}
                    onChange={(e) => updateFormData({ 
                      student: { 
                        address: { 
                          ...formData.student?.address,
                          district: sanitizeString(e.target.value, 100)
                        } 
                      }
                    })}
                    placeholder="Bairro"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    value={formData.student?.address?.city || ''}
                    onChange={(e) => updateFormData({ 
                      student: { 
                        address: { 
                          ...formData.student?.address,
                          city: sanitizeString(e.target.value, 100)
                        } 
                      }
                    })}
                    placeholder="Cidade"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input
                    value={formData.student?.address?.state || ''}
                    onChange={(e) => updateFormData({ 
                      student: { 
                        address: { 
                          ...formData.student?.address,
                          state: sanitizeString(e.target.value.toUpperCase(), 2)
                        } 
                      }
                    })}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Número de Matrícula</Label>
              <Input
                value={formData.student?.enrollmentNumber || ''}
                onChange={(e) => updateFormData({ 
                  student: { enrollmentNumber: sanitizeString(e.target.value, 50) }
                })}
                placeholder="Ex: 2024001"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label>Programa</Label>
              <Select
                value={formData.student?.programId}
                onValueChange={(value) => updateFormData({ 
                  student: { programId: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o programa" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nível</Label>
              <Select
                value={formData.student?.levelId}
                onValueChange={(value) => updateFormData({ 
                  student: { levelId: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Turmas</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-[200px] overflow-y-auto">
                {classes.map((cls) => (
                  <div key={cls.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`class-${cls.id}`}
                      checked={formData.student?.classIds?.includes(cls.id) || false}
                      onCheckedChange={(checked) => {
                        const currentIds = formData.student?.classIds || [];
                        const newIds = checked
                          ? [...currentIds, cls.id]
                          : currentIds.filter(id => id !== cls.id);
                        updateFormData({ student: { classIds: newIds } });
                      }}
                    />
                    <Label 
                      htmlFor={`class-${cls.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {cls.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Responsáveis *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addGuardian}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar Responsável
              </Button>
            </div>

            {formData.student?.guardians?.map((guardian, index) => (
              <div key={guardian.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Responsável {index + 1}</h4>
                  {(formData.student?.guardians?.length || 0) > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGuardian(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input
                      value={guardian.name}
                      onChange={(e) => updateGuardian(index, { name: sanitizeString(e.target.value, 100) })}
                      placeholder="Nome completo"
                      required
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Parentesco *</Label>
                    <Select
                      value={guardian.relation}
                      onValueChange={(value) => updateGuardian(index, { relation: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <InputPhone
                      value={guardian.phone}
                      onChange={(value) => updateGuardian(index, { phone: value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={guardian.email}
                      onChange={(e) => updateGuardian(index, { email: sanitizeString(e.target.value.toLowerCase(), 255) })}
                      placeholder="email@exemplo.com"
                      maxLength={255}
                    />
                  </div>

                  <div className="col-span-2 flex items-center space-x-2">
                    <Switch
                      checked={guardian.isPrimary || false}
                      onCheckedChange={(checked) => {
                        // Se marcar como principal, desmarca os outros
                        if (checked) {
                          const guardians = formData.student?.guardians?.map((g, i) => ({
                            ...g,
                            isPrimary: i === index
                          })) || [];
                          updateFormData({ student: { guardians } });
                        } else {
                          updateGuardian(index, { isPrimary: false });
                        }
                      }}
                    />
                    <Label>Responsável Principal</Label>
                  </div>
                </div>
              </div>
            ))}

            {errors.guardians && (
              <p className="text-sm text-destructive">{errors.guardians}</p>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium">Informações de Saúde</h4>
              
              <div className="space-y-2">
                <Label>Observações de Saúde</Label>
                <Textarea
                  value={formData.student?.healthNotes || ''}
                  onChange={(e) => updateFormData({ 
                    student: { 
                      healthNotes: sanitizeString(e.target.value, 1000)
                    }
                  })}
                  placeholder="Alergias, medicamentos, condições médicas, plano de saúde, etc."
                  maxLength={1000}
                  className="min-h-[120px]"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Autorizações</h4>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="consent-image"
                  checked={formData.student?.consents?.image || false}
                  onCheckedChange={(checked) => updateFormData({ 
                    student: { 
                      consents: { 
                        ...formData.student?.consents, 
                        image: checked as boolean 
                      } 
                    } 
                  })}
                />
                <Label htmlFor="consent-image">Autorizo o uso de imagem</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="consent-fieldtrip"
                  checked={formData.student?.consents?.fieldTrip || false}
                  onCheckedChange={(checked) => updateFormData({ 
                    student: { 
                      consents: { 
                        ...formData.student?.consents, 
                        fieldTrip: checked as boolean 
                      } 
                    } 
                  })}
                />
                <Label htmlFor="consent-fieldtrip">Autorizo participação em saídas pedagógicas</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="consent-whatsapp"
                  checked={formData.student?.consents?.whatsapp || false}
                  onCheckedChange={(checked) => updateFormData({ 
                    student: { 
                      consents: { 
                        ...formData.student?.consents, 
                        whatsapp: checked as boolean 
                      } 
                    } 
                  })}
                />
                <Label htmlFor="consent-whatsapp">Autorizo contato via WhatsApp</Label>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            {/* Credenciais - Apenas para novos alunos */}
            {!student && generatedPassword && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-primary">
                  <Shield className="h-5 w-5" />
                  Credenciais de Acesso Geradas
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">Email de Login</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input value={formData.student?.email || ''} readOnly className="font-mono bg-background" />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(formData.student?.email || '');
                          toast.success('Email copiado!');
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Senha Gerada</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input value={generatedPassword} readOnly className="font-mono bg-background text-lg font-bold" />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedPassword);
                          toast.success('Senha copiada!');
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const text = `Email: ${formData.student?.email}\nSenha: ${generatedPassword}`;
                      navigator.clipboard.writeText(text);
                      toast.success('Dados completos copiados!');
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Todos os Dados de Login
                  </Button>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    ⚠️ Guarde estas credenciais em local seguro e envie para o aluno/responsável
                  </p>
                </div>
              </div>
            )}

            {/* Resetar Senha - Apenas para alunos existentes */}
            {student && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Shield className="h-5 w-5" />
                  Gerenciar Senha
                </h3>
                {!showResetPassword ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetPassword}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Gerar Nova Senha Aleatória
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-muted-foreground">Nova Senha Gerada</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input value={generatedPassword} readOnly className="font-mono bg-background text-lg font-bold" />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedPassword);
                            toast.success('Nova senha copiada!');
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleResetPassword}
                        className="flex-1"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Gerar Outra
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const text = `Email: ${formData.student?.email}\nNova Senha: ${generatedPassword}`;
                          navigator.clipboard.writeText(text);
                          toast.success('Dados completos copiados!');
                        }}
                        className="flex-1"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar Tudo
                      </Button>
                    </div>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      ⚠️ Esta senha será aplicada ao salvar o aluno
                    </p>
                  </div>
                )}
              </div>
            )}

            <h3 className="text-lg font-semibold">Revisão dos Dados</h3>
            
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Dados Pessoais</h4>
                <p><strong>Nome:</strong> {formData.name}</p>
                <p><strong>Data de Nascimento:</strong> {
                  formData.student?.dob ? 
                    format(new Date(formData.student.dob), "dd/MM/yyyy") : 
                    'Não informado'
                }</p>
                {isStudentMinor && <Badge variant="secondary">Menor de idade</Badge>}
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Contato</h4>
                <p><strong>Telefones:</strong> {formData.student?.phones?.filter(p => p.trim()).join(', ') || 'Nenhum'}</p>
                <p><strong>Email:</strong> {formData.student?.email || 'Não informado'}</p>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Acadêmico</h4>
                <p><strong>Programa:</strong> {
                  programs.find(p => p.id === formData.student?.programId)?.name || 'Não selecionado'
                }</p>
                <p><strong>Nível:</strong> {
                  levels.find(l => l.id === formData.student?.levelId)?.name || 'Não selecionado'
                }</p>
                <p><strong>Turmas:</strong> {
                  formData.student?.classIds?.length ? 
                    classes
                      .filter(c => formData.student?.classIds?.includes(c.id))
                      .map(c => c.name)
                      .join(', ') : 
                    'Nenhuma'
                }</p>
              </div>

              {isStudentMinor && formData.student?.guardians?.length && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Responsáveis</h4>
                  {formData.student.guardians.map((guardian, index) => (
                    <div key={guardian.id} className="mb-2">
                      <p><strong>{guardian.name}</strong> - {
                        RELATION_OPTIONS.find(r => r.value === guardian.relation)?.label
                      } {guardian.isPrimary && <Badge variant="default" className="ml-2">Principal</Badge>}</p>
                      <p className="text-sm text-muted-foreground">
                        {guardian.phone} {guardian.email && `• ${guardian.email}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {student ? 'Editar Aluno' : 'Novo Aluno'}
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-6 px-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center gap-2 flex-1",
                  index !== 0 && "relative before:absolute before:right-[50%] before:top-4 before:h-0.5 before:w-full before:bg-border"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                    isActive && "border-primary bg-primary text-primary-foreground",
                    isCompleted && "border-primary bg-primary/10 text-primary",
                    !isActive && !isCompleted && "border-muted-foreground/25 bg-background"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="py-6 min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            
            {!isLastStep ? (
              <Button
                type="button"
                onClick={nextStep}
                className="gap-2"
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="gap-2"
              >
                {loading ? 'Salvando...' : student ? 'Atualizar' : 'Criar'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    
    {createdCredentials && (
      <CredentialsDialog
        open={showCredentials}
        onOpenChange={setShowCredentials}
        name={createdCredentials.name}
        email={createdCredentials.email}
        password={createdCredentials.password}
        role="aluno"
      />
    )}
    </>
  );
}
