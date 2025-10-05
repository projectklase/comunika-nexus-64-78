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
import { Badge } from '@/components/ui/badge';
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
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { validatePhone } from '@/lib/validation';
import { Person, Guardian, StudentExtra } from '@/types/class';

// --- CORREÇÕES ---
// Importar hooks do Supabase em vez dos stores antigos
import { useClasses } from '@/hooks/useClasses';
import { usePrograms } from '@/hooks/usePrograms';
import { useLevels } from '@/hooks/useLevels';
import { supabase } from '@/integrations/supabase/client'; // Importar o cliente Supabase

interface StudentFormStepsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Person | null;
  onSave: () => void; // Adicionar uma prop para atualizar a lista de alunos
}

// ... (as constantes STEPS e RELATION_OPTIONS permanecem as mesmas)
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
  const [formData, setFormData] = useState<Partial<Person & { student: StudentExtra }>>({ /* estado inicial */ });

  // Usar os hooks que buscam dados reais do Supabase
  const { classes } = useClasses();
  const { programs } = usePrograms();
  const { levels } = useLevels();
// ------------------------------------
  // --- CORREÇÕES ---
  // Usar os hooks que buscam dados reais do Supabase
  const { classes } = useClasses();
  const { programs } = usePrograms();
  const { levels } = useLevels();
  // A função isMinor não precisa mais vir de um store
  const isMinor = (dob: string | undefined): boolean => {
    if (!dob) return false;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age < 18;
  };
  
  const isStudentMinor = isMinor(formData.student?.dob);
  const availableSteps = STEPS.filter(step => step.id !== 4 || isStudentMinor);

  useEffect(() => {
    // ... (lógica para inicializar o formulário, pode permanecer a mesma)
  }, [student, open]);

  const updateFormData = (updates: any) => {
    setFormData(prev => ({
      ...prev,
      ...updates,
      student: prev.student ? { ...prev.student, ...updates.student } : updates.student
    }));
  };

  const validateStep = (step: number): boolean => {
    // ... (sua lógica de validação pode permanecer a mesma)
    return true; // Simplificado para o exemplo
  };
  
  // ... (as funções de navegação nextStep, prevStep e de gerenciamento de responsáveis podem permanecer as mesmas)
  
  // --- CORREÇÃO PRINCIPAL ---
  // A nova função handleSubmit que integra tudo com o Supabase
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

      // Se é um NOVO aluno, primeiro criamos o login via Edge Function
      if (!student) {
        const tempPassword = Math.random().toString(36).slice(-8); // Gera senha aleatória
        
        // 1. Chamar a Edge Function para criar o usuário de autenticação
        const { data: authData, error: authError } = await supabase.functions.invoke('create-demo-user', {
          body: {
            email: studentEmail,
            password: tempPassword,
            name: formData.name,
            role: 'aluno'
          }
        });

        if (authError || !authData.success) {
          throw new Error(authError?.message || authData.error || "Erro ao criar o login do aluno.");
        }
        
        studentId = authData.user.id; // Pegamos o ID do usuário recém-criado
        toast.info(`Login para ${formData.name} criado. Senha temporária: ${tempPassword}`);
      }

      if (!studentId) {
        throw new Error("Não foi possível obter o ID do aluno.");
      }

      // 2. Salvar/Atualizar o perfil detalhado na tabela 'profiles'
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: studentId,
          name: formData.name?.trim(),
          email: studentEmail, // Garantir que o email esteja na tabela profiles também
          role: 'aluno',
          // Outros campos da tabela profiles que você tenha...
        });

      if (profileError) throw profileError;
      
      // 3. Salvar/Atualizar os responsáveis na tabela 'guardians'
      if (formData.student?.guardians && formData.student.guardians.length > 0) {
        const guardiansData = formData.student.guardians.map(g => ({
          student_id: studentId,
          name: g.name,
          relation: g.relation,
          phone: g.phone,
          email: g.email,
          is_primary: g.isPrimary,
        }));
        // Primeiro, deleta os antigos para simplificar
        await supabase.from('guardians').delete().eq('student_id', studentId);
        // Insere os novos
        const { error: guardianError } = await supabase.from('guardians').insert(guardiansData);
        if (guardianError) throw guardianError;
      }

      // 4. Matricular o aluno nas turmas na tabela 'class_students'
      if (formData.student?.classIds && formData.student.classIds.length > 0) {
        const classStudentsData = formData.student.classIds.map(classId => ({
          student_id: studentId,
          class_id: classId,
        }));
        // Primeiro, deleta as matrículas antigas para simplificar
        await supabase.from('class_students').delete().eq('student_id', studentId);
        // Insere as novas
        const { error: classStudentError } = await supabase.from('class_students').insert(classStudentsData);
        if (classStudentError) throw classStudentError;
      }
      
      toast.success(`Aluno ${student ? 'atualizado' : 'criado'} com sucesso!`);
      onSave(); // Chama a função para atualizar a lista de alunos na página principal
      onOpenChange(false);

    } catch (error: any) {
      console.error('Erro ao salvar aluno:', error);
      toast.error(`Erro ao salvar aluno: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

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
                onChange={(e) => updateFormData({ name: e.target.value })}
                placeholder="Digite o nome completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Data de Nascimento *</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={formData.student?.dob || ''}
                  onChange={(e) => 
                    updateFormData({ 
                      student: { dob: e.target.value || undefined } 
                    })
                  }
                  max={format(new Date(), 'yyyy-MM-dd')}
                  min="1900-01-01"
                  className="pr-10"
                  placeholder="dd/mm/aaaa"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      type="button"
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.student?.dob ? new Date(formData.student.dob) : undefined}
                      onSelect={(date) => 
                        updateFormData({ 
                          student: { dob: date ? format(date, 'yyyy-MM-dd') : undefined } 
                        })
                      }
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="document">Documento (CPF/RG)</Label>
              <Input
                id="document"
                value={formData.student?.document || ''}
                onChange={(e) => updateFormData({ student: { document: e.target.value } })}
                placeholder="000.000.000-00"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive || false}
                onCheckedChange={(checked) => updateFormData({ isActive: checked })}
              />
              <Label htmlFor="isActive">Ativo</Label>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Telefones *</Label>
              {formData.student?.phones?.map((phone, index) => (
                <div key={index} className="flex gap-2">
                  <InputPhone
                    value={phone}
                    onChange={(value) => {
                      const phones = [...(formData.student?.phones || [])];
                      phones[index] = value;
                      updateFormData({ student: { phones } });
                    }}
                    placeholder="(11) 99999-0000"
                  />
                  {formData.student?.phones && formData.student.phones.length > 1 && (
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const phones = formData.student?.phones?.filter((_, i) => i !== index);
                        updateFormData({ student: { phones } });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const phones = [...(formData.student?.phones || []), ''];
                  updateFormData({ student: { phones } });
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar Telefone
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.student?.email || ''}
                onChange={(e) => updateFormData({ student: { email: e.target.value } })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-4">
              <Label>Endereço</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="zip">CEP</Label>
                  <Input
                    id="zip"
                    value={formData.student?.address?.zip || ''}
                    onChange={(e) => updateFormData({ 
                      student: { 
                        address: { ...formData.student?.address, zip: e.target.value } 
                      } 
                    })}
                    placeholder="00000-000"
                  />
                </div>
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.student?.address?.city || ''}
                    onChange={(e) => updateFormData({ 
                      student: { 
                        address: { ...formData.student?.address, city: e.target.value } 
                      } 
                    })}
                    placeholder="São Paulo"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="street">Rua</Label>
                  <Input
                    id="street"
                    value={formData.student?.address?.street || ''}
                    onChange={(e) => updateFormData({ 
                      student: { 
                        address: { ...formData.student?.address, street: e.target.value } 
                      } 
                    })}
                    placeholder="Rua das Flores"
                  />
                </div>
                <div>
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    value={formData.student?.address?.number || ''}
                    onChange={(e) => updateFormData({ 
                      student: { 
                        address: { ...formData.student?.address, number: e.target.value } 
                      } 
                    })}
                    placeholder="123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="district">Bairro</Label>
                  <Input
                    id="district"
                    value={formData.student?.address?.district || ''}
                    onChange={(e) => updateFormData({ 
                      student: { 
                        address: { ...formData.student?.address, district: e.target.value } 
                      } 
                    })}
                    placeholder="Centro"
                  />
                </div>
                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={formData.student?.address?.state || ''}
                    onChange={(e) => updateFormData({ 
                      student: { 
                        address: { ...formData.student?.address, state: e.target.value } 
                      } 
                    })}
                    placeholder="SP"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        const filteredClasses = classes.filter(c => 
          c.status === 'ATIVA' &&
          (!formData.student?.levelId || c.levelId === formData.student.levelId)
        );

        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Programa *</Label>
              <Select 
                 value={formData.student?.programId || ''} 
                onValueChange={(value) => {
                  updateFormData({ 
                    student: { 
                      programId: value,
                      levelId: undefined,
                      classIds: []
                    } 
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um programa" />
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
              <Label>Nível *</Label>
              <Select 
                value={formData.student?.levelId || ''} 
                onValueChange={(value) => {
                  updateFormData({ 
                    student: { 
                      levelId: value,
                      classIds: []
                    } 
                  });
                }}
                disabled={!formData.student?.programId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um nível" />
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
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                {filteredClasses.length > 0 ? (
                  filteredClasses.map((cls) => (
                    <div key={cls.id} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`class-${cls.id}`}
                        checked={formData.student?.classIds?.includes(cls.id) || false}
                        onCheckedChange={(checked) => {
                          const classIds = formData.student?.classIds || [];
                          const newClassIds = checked
                            ? [...classIds, cls.id]
                            : classIds.filter(id => id !== cls.id);
                          updateFormData({ student: { classIds: newClassIds } });
                        }}
                      />
                      <Label htmlFor={`class-${cls.id}`} className="text-sm">
                        {cls.name} {cls.code && `(${cls.code})`}
                      </Label>
                    </div>
                  ))
                 ) : (
                  <p className="text-sm text-muted-foreground">
                    {!formData.student?.levelId
                      ? 'Selecione um nível para ver as turmas'
                      : 'Nenhuma turma disponível para este nível'
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        if (!isStudentMinor) return null;

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
                      onChange={(e) => updateGuardian(index, { name: e.target.value })}
                      placeholder="Nome completo"
                      required
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
                    <Label>Telefone *</Label>
                    <InputPhone
                      value={guardian.phone || ''}
                      onChange={(value) => updateGuardian(index, { phone: value })}
                      placeholder="(11) 99999-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={guardian.email || ''}
                      onChange={(e) => updateGuardian(index, { email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`primary-${guardian.id}`}
                    checked={guardian.isPrimary || false}
                    onCheckedChange={(checked) => updateGuardian(index, { isPrimary: checked as boolean })}
                  />
                  <Label htmlFor={`primary-${guardian.id}`}>Responsável Principal</Label>
                </div>
              </div>
            ))}

            {(!formData.student?.guardians?.length) && (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-3">Nenhum responsável adicionado</p>
                <Button variant="outline" onClick={addGuardian}>
                  Adicionar Primeiro Responsável
                </Button>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="healthNotes">Observações de Saúde</Label>
              <Textarea
                id="healthNotes"
                value={formData.student?.healthNotes || ''}
                onChange={(e) => updateFormData({ student: { healthNotes: e.target.value } })}
                placeholder="Alergias, medicamentos, observações médicas..."
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>Autorizações</Label>
              
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
                      <p className="text-sm text-muted-foreground">{guardian.phone}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 pt-4">
              <Button onClick={handleSubmit} disabled={loading} className="gap-2">
                {loading ? 'Salvando...' : student ? 'Atualizar Aluno' : 'Criar Aluno'}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const currentStepIndex = availableSteps.findIndex(s => s.id === currentStep);
  const isLastStep = currentStepIndex === availableSteps.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {student ? 'Editar Aluno' : 'Novo Aluno'}
          </DialogTitle>
        </DialogHeader>

        {/* Steps Navigation */}
        <div className="flex flex-wrap justify-center gap-2 py-4 border-b">
          {availableSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = availableSteps.findIndex(s => s.id === currentStep) > index;
            
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && !isActive && "bg-muted text-muted-foreground",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{step.title}</span>
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
  );
}