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
import { useDuplicateCheck, DuplicateCheckResult } from '@/hooks/useDuplicateCheck';
import { DuplicateWarning } from '@/components/forms/DuplicateWarning';
import { SiblingGuardianSuggestion } from './SiblingGuardianSuggestion';
import { useSchool } from '@/contexts/SchoolContext';

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
  // 👨‍👩‍👧 RESPONSÁVEIS LEGAIS (guarda/custódia)
  { value: 'MAE', label: 'Mãe', category: 'legal' },
  { value: 'PAI', label: 'Pai', category: 'legal' },
  { value: 'RESPONSAVEL', label: 'Responsável Legal', category: 'legal' },
  { value: 'TUTOR', label: 'Tutor', category: 'legal' },
  
  // 👪 FAMÍLIA ESTENDIDA (parentesco sem guarda)
  { value: 'TIO', label: 'Tio/Tia', category: 'extended' },
  { value: 'AVO', label: 'Avô/Avó', category: 'extended' },
  { value: 'IRMAO', label: 'Irmão/Irmã', category: 'extended' },
  { value: 'PADRINHO', label: 'Padrinho/Madrinha', category: 'extended' },
  
  // ❓ OUTRO
  { value: 'OUTRO', label: 'Outro', category: 'other' },
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
  const [dobInput, setDobInput] = useState<string>('');
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [userConfirmedDuplicates, setUserConfirmedDuplicates] = useState(false);
  const [showSiblingSuggestion, setShowSiblingSuggestion] = useState(false);
  const [siblingCandidates, setSiblingCandidates] = useState<any[]>([]);

  // Helper para mapear campos do backend para o DuplicateWarning
  const mapFieldType = (field: string): 'email' | 'name' | 'phone' | 'document' | 'enrollment' => {
    const fieldMap: Record<string, 'email' | 'name' | 'phone' | 'document' | 'enrollment'> = {
      'cpf': 'document',
      'document': 'document',
      'enrollment_number': 'enrollment',
      'email': 'email',
      'phone': 'phone',
      'name': 'name'
    };
    
    return fieldMap[field] || 'document';
  };

  const { classes } = useClasses();
  const { programs } = usePrograms();
  const { levels } = useLevels();
  const { createStudent, updateStudent } = useStudents();
  const { currentSchool } = useSchool();
  const { checkDuplicates, isChecking } = useDuplicateCheck(currentSchool?.id || null);

  useEffect(() => {
    if (open) {
      if (student) {
        // Carrega dados do aluno para edição
        const loadStudentData = async () => {
          setLoading(true);
          try {
            // Busca guardians
            const { data: guardiansData } = await supabase
              .from('guardians')
              .select('*')
              .eq('student_id', student.id);

            // Busca turmas
            const { data: classStudents } = await supabase
              .from('class_students')
              .select('class_id')
              .eq('student_id', student.id);

            // Busca o perfil completo do aluno
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', student.id)
              .single();

            const classIds = classStudents?.map(cs => cs.class_id) || [];

            // Mapeia guardians
            const guardians = guardiansData?.map(g => ({
              id: g.id || crypto.randomUUID(),
              name: g.name || '',
              relation: g.relation as any || 'RESPONSAVEL',
              phone: g.phone || '',
              email: g.email || '',
              isPrimary: g.is_primary || false
            })) || [];

            // Extrai informações do student_notes (JSON)
            let studentData: any = {};
            try {
              if (profileData?.student_notes) {
                studentData = typeof profileData.student_notes === 'string' 
                  ? JSON.parse(profileData.student_notes)
                  : profileData.student_notes;
              }
            } catch (e) {
              console.error('Erro ao parsear student_notes:', e);
            }

            // Preenche o formulário com TODOS os dados
            setFormData({
              name: student.name || '',
              email: student.email || '',
              role: student.role || 'ALUNO',
              student: {
                dob: profileData?.dob || student.student?.dob,
                phones: (profileData?.phone ? [profileData.phone] : student.student?.phones) || [''],
                email: student.email || '',
                document: studentData.document || student.student?.document || '',
                address: {
                  street: studentData.address?.street || student.student?.address?.street || '',
                  number: studentData.address?.number || student.student?.address?.number || '',
                  district: studentData.address?.district || student.student?.address?.district || '',
                  city: studentData.address?.city || student.student?.address?.city || '',
                  state: studentData.address?.state || student.student?.address?.state || '',
                  zip: studentData.address?.zip || student.student?.address?.zip || ''
                },
                guardians: guardians.length > 0 ? guardians : [{
                  id: crypto.randomUUID(),
                  name: '',
                  relation: 'MAE' as const,
                  phone: '',
                  email: '',
                  isPrimary: true
                }],
                enrollmentNumber: profileData?.enrollment_number || student.student?.enrollmentNumber || '',
                programId: studentData.programId || student.student?.programId,
                levelId: studentData.levelId || student.student?.levelId,
                classIds,
                healthNotes: studentData.healthNotes || student.student?.healthNotes || '',
                consents: {
                  image: studentData.consents?.image || student.student?.consents?.image || false,
                  fieldTrip: studentData.consents?.fieldTrip || student.student?.consents?.fieldTrip || false,
                  whatsapp: studentData.consents?.whatsapp || student.student?.consents?.whatsapp || false
                }
              }
            });

            // Inicializa dobInput com a data formatada se existir
            const dob = profileData?.dob || student.student?.dob;
            if (dob) {
              setDobInput(format(new Date(dob), "dd/MM/yyyy"));
            }
          } catch (error) {
            console.error('Erro ao carregar dados do aluno:', error);
            toast.error('Erro ao carregar dados do aluno');
          } finally {
            setLoading(false);
          }
        };

        loadStudentData();
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
      setDobInput('');
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
        ...updates.student,
        // Preserva corretamente o endereço aninhado
        address: updates.student?.address 
          ? { ...prev.student?.address, ...updates.student.address }
          : prev.student?.address
      }
    }));
  };

  // Função para buscar endereço pelo CEP usando ViaCEP
  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      // Atualiza os campos do endereço com os dados retornados
      updateFormData({
        student: {
          address: {
            ...formData.student?.address,
            zip: cep,
            street: data.logradouro || '',
            district: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || ''
          }
        }
      });

      toast.success('Endereço encontrado!');
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Dados Pessoais
        // Nome obrigatório
        if (!formData.name?.trim()) {
          newErrors.name = 'Nome é obrigatório';
        } else {
          const nameValidation = validateName(formData.name);
          if (nameValidation) {
            newErrors.name = nameValidation;
          }
        }

        // Data de nascimento obrigatória
        if (!formData.student?.dob) {
          newErrors.dob = 'Data de nascimento é obrigatória';
        } else {
          const birthDate = new Date(formData.student.dob);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          if (age > 120 || age < 0) {
            newErrors.dob = 'Data de nascimento inválida';
          }
        }
        break;

      case 2: // Contato & Endereço
        // Email obrigatório
        if (!formData.student?.email) {
          newErrors.studentEmail = 'Email é obrigatório para criar login';
        } else {
          const emailValidation = validateEmail(formData.student.email);
          if (emailValidation) {
            newErrors.email = emailValidation;
          }
        }

        // Valida telefones se preenchidos
        formData.student?.phones?.forEach((phone, index) => {
          if (phone && validatePhone(phone)) {
            newErrors[`phone${index}`] = validatePhone(phone) || 'Telefone inválido';
          }
        });

        // Pelo menos um telefone obrigatório (do aluno ou do responsável se menor)
        const isMinor = formData.student?.dob ? 
          (new Date().getFullYear() - new Date(formData.student.dob).getFullYear()) < 18 : 
          true;
        
        const hasStudentPhone = formData.student?.phones?.some(p => p.trim().length > 0);
        
        if (!hasStudentPhone && !isMinor) {
          newErrors.phones = 'Pelo menos um telefone é obrigatório';
        }

        if (formData.student?.address?.zip) {
          const zipValidation = validateZipCode(formData.student.address.zip);
          if (zipValidation) {
            newErrors.zipCode = zipValidation;
          }
        }
        break;

      case 3: // Acadêmico
        // Email já validado no step 2
        if (!formData.student?.email) {
          newErrors.studentEmail = 'Email é obrigatório para criar login';
        }
        break;

      case 4: // Responsável
        const studentIsMinor = formData.student?.dob ? 
          (new Date().getFullYear() - new Date(formData.student.dob).getFullYear()) < 18 : 
          true;

        if (studentIsMinor) {
          // Menor de idade: pelo menos um responsável com nome E telefone obrigatório
          const hasValidGuardian = formData.student?.guardians?.some(g => 
            g.name.trim() && g.phone.trim()
          );
          
          if (!hasValidGuardian) {
            newErrors.guardians = 'Ao menos um responsável com nome e telefone é obrigatório para menores';
          }

          // Valida telefones dos responsáveis
          formData.student?.guardians?.forEach((guardian, index) => {
            if (guardian.phone && validatePhone(guardian.phone)) {
              newErrors[`guardian_phone${index}`] = 'Telefone do responsável inválido';
            }
          });

          // Valida emails dos responsáveis se preenchidos
          formData.student?.guardians?.forEach((guardian, index) => {
            if (guardian.email && validateEmail(guardian.email)) {
              newErrors[`guardian_email${index}`] = 'Email do responsável inválido';
            }
          });
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // FASE 1: Validação preventiva de duplicatas por etapa
  const validateDuplicatesForStep = async (step: number): Promise<boolean> => {
    let checkData: any = {};
    
    switch (step) {
      case 1: // Dados Pessoais - Valida CPF
        if (formData.student?.document) {
          const cpf = onlyDigits(formData.student.document);
          if (cpf && cpf.length === 11) {
            checkData.cpf = cpf;
          }
        }
        break;
        
      case 2: // Contato & Endereço - Valida Email
        if (formData.student?.email) {
          checkData.email = formData.student.email;
        }
        break;
        
      case 3: // Acadêmico - Valida Matrícula
        if (formData.student?.enrollmentNumber) {
          checkData.enrollmentNumber = formData.student.enrollmentNumber;
        }
        break;
        
      default:
        return true; // Outras etapas não têm validação de duplicata
    }
    
    // Se não há dados sensíveis preenchidos, libera navegação
    if (Object.keys(checkData).length === 0) {
      return true;
    }
    
    // Verifica duplicatas
    const result = await checkDuplicates(checkData, student?.id);
    
    // Se houver bloqueantes, impede navegação e mostra modal
    if (result.hasBlocking) {
      setDuplicateCheck(result);
      setShowDuplicateModal(true);
      
      // Monta mensagem específica
      const blockedFields = result.blockingIssues.map(issue => {
        if (issue.field === 'cpf') return 'CPF';
        if (issue.field === 'email') return 'Email';
        if (issue.field === 'enrollment_number') return 'Matrícula';
        return issue.field;
      }).join(', ');
      
      toast.error(`${blockedFields} já cadastrado(s). Corrija antes de prosseguir.`);
      return false;
    }
    
    return true;
  };

  // FASE 2: nextStep com validação de duplicatas
  const nextStep = async () => {
    // 1. Valida campos obrigatórios primeiro (lógica existente)
    if (!validateStep(currentStep)) {
      toast.error('Preencha os campos obrigatórios corretamente');
      return;
    }
    
    // 2. Valida duplicatas bloqueantes ANTES de avançar
    const canProceed = await validateDuplicatesForStep(currentStep);
    
    if (!canProceed) {
      // Modal de duplicata já foi exibido pela função validateDuplicatesForStep
      return;
    }
    
    // 3. Se passou em ambas validações, avança
    const nextStepNumber = currentStep + 1;
    setCurrentStep(prev => Math.min(prev + 1, 6));

    // 4. Detectar irmãos ao avançar para Step 4 (Responsável)
    if (nextStepNumber === 4 && !student) {
      await detectSiblings();
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

  // Detectar possíveis irmãos
  const detectSiblings = async () => {
    const phone = formData.student?.phones?.[0];
    const address = formData.student?.address;

    if (!phone && !address) {
      return;
    }

    const result = await checkDuplicates({
      phone,
      address,
    }, student?.id);

    // Filtrar similaridades de telefone/endereço que tenham guardians
    const phoneSimilar = result.similarities.find(s => s.type === 'phone');
    const addressSimilar = result.similarities.find(s => s.type === 'address');

    const candidates = [
      ...(phoneSimilar?.existingUsers || []),
      ...(addressSimilar?.existingUsers || []),
    ].filter((user, index, self) => 
      // Remove duplicatas e filtra apenas quem tem guardians
      self.findIndex(u => u.id === user.id) === index &&
      user.guardians && user.guardians.length > 0
    );

    if (candidates.length > 0) {
      setSiblingCandidates(candidates);
      setShowSiblingSuggestion(true);
    }
  };

  // Verificar se o responsável já está cadastrado em outro aluno
  const checkGuardianDuplicates = async (
    guardianEmail?: string,
    guardianPhone?: string
  ) => {
    if (!currentSchool?.id || (!guardianEmail && !guardianPhone)) {
      return [];
    }

    try {
      // Buscar responsáveis com email ou telefone similar
      let query = supabase
        .from('guardians')
        .select('id, name, email, phone, relation, student_id');

      if (guardianEmail) {
        query = query.eq('email', guardianEmail.toLowerCase().trim());
      } else if (guardianPhone) {
        const cleanPhone = guardianPhone.replace(/\D/g, '');
        query = query.eq('phone', cleanPhone);
      }

      const { data: existingGuardians } = await query;

      if (!existingGuardians || existingGuardians.length === 0) {
        return [];
      }

      // Buscar os alunos relacionados a esses responsáveis
      const studentIds = [...new Set(existingGuardians.map(g => g.student_id))];
      
      const { data: studentsData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', studentIds)
        .eq('current_school_id', currentSchool.id);

      if (!studentsData || studentsData.length === 0) {
        return [];
      }

      // Buscar TODOS os responsáveis de cada aluno encontrado
      const { data: allGuardiansData } = await supabase
        .from('guardians')
        .select('*')
        .in('student_id', studentIds);

      // Montar array de alunos com seus responsáveis
      const candidates = studentsData.map(student => {
        const studentGuardians = allGuardiansData?.filter(
          g => g.student_id === student.id
        ) || [];

        return {
          id: student.id,
          name: student.name,
          email: student.email,
          guardians: studentGuardians.map(g => ({
            id: g.id,
            name: g.name,
            relation: g.relation,
            phone: g.phone || undefined,
            email: g.email || undefined,
            isPrimary: g.is_primary || false,
          })),
        };
      });

      return candidates;
    } catch (error) {
      console.error('Erro ao verificar responsável duplicado:', error);
      return [];
    }
  };

  // Helper para mensagem contextual de responsável duplicado
  const showGuardianDuplicateWarning = (candidates: any[]) => {
    const guardianName = candidates[0]?.guardians?.[0]?.name || 'Este responsável';
    const studentNames = candidates.map(c => c.name).join(', ');
    
    toast.warning(
      `${guardianName} já é responsável por: ${studentNames}. Deseja vincular como parente?`,
      { 
        duration: 6000,
        action: {
          label: 'Ver',
          onClick: () => {
            setSiblingCandidates(candidates);
            setShowSiblingSuggestion(true);
          }
        }
      }
    );
    
    // Abrir modal automaticamente
    setSiblingCandidates(candidates);
    setShowSiblingSuggestion(true);
  };

  // ✨ Helper: Retorna o tipo de relacionamento recíproco
  const getReciprocalType = (type: string): string => {
    const reciprocal: Record<string, string> = {
      'SIBLING': 'SIBLING',           // Irmão ↔ Irmão
      'COUSIN': 'COUSIN',             // Primo ↔ Primo
      'UNCLE_NEPHEW': 'UNCLE_NEPHEW', // Tio-Sobrinho ↔ Sobrinho-Tio (mesmo tipo)
      'GODPARENT_GODCHILD': 'GODPARENT_GODCHILD', // Será validado na Fase 4
      'OTHER': 'OTHER',
    };
    return reciprocal[type] || type;
  };

  // Copiar guardians de um irmão com registro de relacionamento familiar BIDIRECIONAL
  const handleCopyGuardians = (
    guardians: any[], 
    relatedStudentId: string,
    relatedStudentName: string,
    relationshipData: { type: string; customLabel?: string }
  ) => {
    // 1. Copiar os responsáveis (lógica existente mantida)
    updateFormData({
      student: {
        guardians: guardians.map(g => ({
          id: crypto.randomUUID(), // Novo ID sempre
          name: g.name,
          relation: g.relation,
          phone: g.phone || '',
          email: g.email || '',
          isPrimary: g.isPrimary || false,
        }))
      }
    });
    
    // 2. ✨ NOVO: Registrar o relacionamento familiar BIDIRECIONAL
    const relationshipRecord = {
      relatedStudentId,
      relatedStudentName,
      relationshipType: relationshipData.type as 'SIBLING' | 'COUSIN' | 'UNCLE_NEPHEW' | 'GODPARENT_GODCHILD' | 'OTHER',
      customRelationship: relationshipData.customLabel,
      createdAt: new Date().toISOString(),
    };
    
    // Atualizar formData para incluir o relacionamento A→B
    setFormData(prev => ({
      ...prev,
      student: {
        ...prev.student,
        notes: {
          ...prev.student?.notes,
          familyRelationships: [
            ...(prev.student?.notes?.familyRelationships || []),
            relationshipRecord
          ]
        }
      }
    }));

    // 3. ✨ NOVO: Preparar relacionamento recíproco B→A para salvar no handleSubmit
    // Será salvo quando o aluno for criado/atualizado
    const reciprocalRelationship = {
      targetStudentId: relatedStudentId,
      relationship: {
        relatedStudentId: '', // Será preenchido com o ID do aluno atual no handleSubmit
        relatedStudentName: formData.name || '',
        relationshipType: getReciprocalType(relationshipData.type) as 'SIBLING' | 'COUSIN' | 'UNCLE_NEPHEW' | 'GODPARENT_GODCHILD' | 'OTHER',
        customRelationship: relationshipData.customLabel,
        createdAt: new Date().toISOString(),
      }
    };

    // Guardar o relacionamento recíproco no state para processar depois
    setFormData(prev => ({
      ...prev,
      student: {
        ...prev.student,
        pendingReciprocalRelationships: [
          ...(prev.student?.pendingReciprocalRelationships || []),
          reciprocalRelationship
        ]
      }
    }));
    
    const relationLabel = getRelationshipLabel(relationshipData);
    toast.success(`Responsáveis copiados e relação "${relationLabel}" registrada (bidirecional)!`);
    setShowSiblingSuggestion(false);
  };

  // Helper para exibir label amigável do relacionamento
  const getRelationshipLabel = (data: { type: string; customLabel?: string }) => {
    if (data.type === 'OTHER') return data.customLabel;
    const labels: Record<string, string> = {
      'SIBLING': 'Irmão/Irmã',
      'COUSIN': 'Primo/Prima',
      'UNCLE_NEPHEW': 'Tio-Sobrinho',
      'GODPARENT_GODCHILD': 'Padrinho-Afilhado',
    };
    return labels[data.type] || data.type;
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

    // VALIDAÇÃO DE DUPLICATAS antes do submit
    const result = await checkDuplicates({
      cpf: formData.student?.document,
      enrollmentNumber: formData.student?.enrollmentNumber,
      name: formData.name,
      dob: formData.student?.dob,
      phone: formData.student?.phones?.[0],
      address: formData.student?.address
    }, student?.id);

    // Se houver bloqueantes, impede submit
    if (result.hasBlocking) {
      toast.error('Existem duplicatas que impedem o cadastro. Revise os dados.');
      setDuplicateCheck(result);
      setShowDuplicateModal(true);
      return;
    }

    // Se houver similaridades e usuário não confirmou, exibe alerta
    if (result.hasSimilarities && !userConfirmedDuplicates) {
      setDuplicateCheck(result);
      setShowDuplicateModal(true);
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
        // Monta o student_notes com TODOS os dados extras
        const studentNotesData = {
          document: formData.student?.document,
          address: formData.student?.address,
          programId: formData.student?.programId,
          levelId: formData.student?.levelId,
          healthNotes: formData.student?.healthNotes,
          consents: formData.student?.consents,
          familyRelationships: formData.student?.notes?.familyRelationships
        };

        const result = await createStudent({
          name: formData.name || '',
          email: studentEmail,
          password: generatedPassword,
          dob: formData.student?.dob,
          phone: formData.student?.phones?.[0],
          enrollment_number: formData.student?.enrollmentNumber,
          student_notes: JSON.stringify(studentNotesData)
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
        // Monta o student_notes com TODOS os dados extras
        const studentNotesData = {
          document: formData.student?.document,
          address: formData.student?.address,
          programId: formData.student?.programId,
          levelId: formData.student?.levelId,
          healthNotes: formData.student?.healthNotes,
          consents: formData.student?.consents,
          familyRelationships: formData.student?.notes?.familyRelationships
        };

        const updateData: any = {
          name: formData.name?.trim(),
          email: studentEmail,
          dob: formData.student?.dob,
          phone: formData.student?.phones?.[0],
          enrollment_number: formData.student?.enrollmentNumber,
          student_notes: JSON.stringify(studentNotesData)
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

      // Salvar guardiões com validação ANTES de deletar
      if (formData.student?.guardians && formData.student.guardians.length > 0) {
        // ✅ FASE 4.1: Validar guardians ANTES de deletar os existentes
        const validGuardians = formData.student.guardians
          .filter(g => g.name?.trim() && g.relation) // Nome E relação são obrigatórios
          .map(g => ({
            student_id: studentId,
            name: g.name.trim(),
            relation: g.relation,
            phone: g.phone?.trim() || null,
            email: g.email?.trim() || null,
            is_primary: g.isPrimary || false
          }));

        // ✅ FASE 4.2: Verificar se aluno menor de idade tem pelo menos 1 guardião
        const studentAge = formData.student?.dob 
          ? Math.floor((new Date().getTime() - new Date(formData.student.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null;
        
        const isMinor = studentAge !== null && studentAge < 18;

        if (validGuardians.length === 0 && isMinor) {
          toast.error('⚠️ Alunos menores de idade precisam de pelo menos um responsável com nome e parentesco preenchidos');
          throw new Error('Responsável obrigatório incompleto');
        }

        // ✅ FASE 4.3: Só deleta e re-insere se houver guardians válidos
        if (validGuardians.length > 0) {
          await supabase
            .from('guardians')
            .delete()
            .eq('student_id', studentId);

          const { error: insertError } = await supabase
            .from('guardians')
            .insert(validGuardians);

          if (insertError) {
            console.error('Erro ao inserir guardians:', insertError);
            toast.error('Erro ao salvar responsáveis');
            throw insertError;
          }

          console.log(`✅ ${validGuardians.length} responsável(is) salvos com sucesso`);
        } else if (!isMinor) {
          // Aluno maior de idade sem guardians - limpar todos
          await supabase
            .from('guardians')
            .delete()
            .eq('student_id', studentId);
        }
      }

      // ✨ FASE 1: Criar relacionamentos recíprocos (B→A) nos alunos relacionados
      if (formData.student?.pendingReciprocalRelationships && formData.student.pendingReciprocalRelationships.length > 0) {
        console.log('🔄 Criando relacionamentos recíprocos...');
        
        for (const pending of formData.student.pendingReciprocalRelationships) {
          try {
            // Buscar student_notes do aluno relacionado
            const { data: relatedStudent, error: fetchError } = await supabase
              .from('profiles')
              .select('student_notes')
              .eq('id', pending.targetStudentId)
              .single();

            if (fetchError) {
              console.error(`Erro ao buscar aluno relacionado ${pending.targetStudentId}:`, fetchError);
              continue;
            }

            // Parse dos student_notes existentes
            const existingNotes = relatedStudent?.student_notes 
              ? JSON.parse(relatedStudent.student_notes) 
              : {};

            // Adicionar relacionamento recíproco com o ID correto do aluno atual
            const reciprocalRel = {
              ...pending.relationship,
              relatedStudentId: studentId, // ID do aluno que acabamos de criar/atualizar
            };

            const updatedNotes = {
              ...existingNotes,
              familyRelationships: [
                ...(existingNotes.familyRelationships || []),
                reciprocalRel
              ]
            };

            // Atualizar o aluno relacionado
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ student_notes: JSON.stringify(updatedNotes) })
              .eq('id', pending.targetStudentId);

            if (updateError) {
              console.error(`Erro ao atualizar relacionamento recíproco para ${pending.targetStudentId}:`, updateError);
            } else {
              console.log(`✅ Relacionamento recíproco criado: ${pending.targetStudentId} → ${studentId}`);
            }
          } catch (err) {
            console.error('Erro ao processar relacionamento recíproco:', err);
          }
        }
      }

      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar aluno:', error);
      
      const errorMsg = error.message || String(error);
      
      // ✅ Detectar email duplicado e abrir modal específico
      if (errorMsg.includes('Este email já está cadastrado') ||
          errorMsg.includes('Email já cadastrado') ||
          errorMsg.includes('já está cadastrado no sistema') ||
          errorMsg.includes('duplicate') ||
          errorMsg.includes('already exists') ||
          errorMsg.includes('User already registered')) {

        // Construir objeto de duplicata bloqueante e abrir modal
        const duplicateResult = {
          hasBlocking: true,
          blockingIssues: [{
            field: 'email' as const,
            value: formData.student?.email || '',
            message: 'Este email já está cadastrado no sistema. Use outro email.',
            existingUser: null
          }],
          hasSimilarities: false,
          similarities: []
        };

        setDuplicateCheck(duplicateResult);
        setShowDuplicateModal(true);
        setErrors(prev => ({ ...prev, email: 'Email já cadastrado' }));
      } else {
        // Erro genérico
        toast.error(errorMsg || 'Erro ao salvar aluno');
      }
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
              <Label htmlFor="dob">Data de Nascimento *</Label>
              <Input
                id="dob"
                value={dobInput}
                onChange={(e) => {
                  const input = e.target.value;
                  let digits = input.replace(/\D/g, '');
                  
                  // Aplica máscara DD/MM/YYYY
                  let formatted = '';
                  if (digits.length > 0) {
                    formatted = digits.slice(0, 2);
                    if (digits.length >= 3) {
                      formatted += '/' + digits.slice(2, 4);
                    }
                    if (digits.length >= 5) {
                      formatted += '/' + digits.slice(4, 8);
                    }
                  }
                  
                  setDobInput(formatted);
                  
                  // Tenta converter para ISO quando completo
                  if (digits.length === 8) {
                    const day = digits.slice(0, 2);
                    const month = digits.slice(2, 4);
                    const year = digits.slice(4, 8);
                    
                    const dayNum = parseInt(day, 10);
                    const monthNum = parseInt(month, 10);
                    const yearNum = parseInt(year, 10);
                    
                    // Validação básica
                    if (dayNum >= 1 && dayNum <= 31 && 
                        monthNum >= 1 && monthNum <= 12 && 
                        yearNum >= 1900 && yearNum <= new Date().getFullYear()) {
                      const isoDate = `${year}-${month}-${day}`;
                      updateFormData({ student: { dob: isoDate } });
                      
                      // Limpa erro se havia
                      if (errors.dob) {
                        setErrors(prev => {
                          const { dob, ...rest } = prev;
                          return rest;
                        });
                      }
                    }
                  } else {
                    // Ainda está digitando, limpa a data
                    updateFormData({ student: { dob: undefined } });
                  }
                }}
                placeholder="DD/MM/AAAA"
                maxLength={10}
                className={errors.dob ? 'border-destructive' : ''}
              />
              {formData.student?.dob && isStudentMinor && (
                <Badge variant="secondary" className="text-xs">
                  Menor de idade - Telefone do responsável será obrigatório
                </Badge>
              )}
              {formData.student?.dob && !isStudentMinor && (
                <Badge variant="outline" className="text-xs">
                  Maior de idade
                </Badge>
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
                  
                  // Limpa erro ao digitar
                  if (errors.cpf) {
                    setErrors(prev => {
                      const { cpf, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                onBlur={async () => {
                  const cpf = onlyDigits(formData.student?.document || '');
                  if (cpf && cpf.length === 11) {
                    const result = await checkDuplicates({ cpf }, student?.id);
                    if (result.hasBlocking) {
                      const issue = result.blockingIssues.find(i => i.field === 'cpf');
                      if (issue) {
                        setErrors(prev => ({ ...prev, cpf: issue.message }));
                        toast.error(issue.message);
                      }
                    }
                  }
                }}
                placeholder="000.000.000-00"
                maxLength={14}
                className={errors.cpf ? 'border-destructive' : ''}
              />
              {errors.cpf && (
                <p className="text-sm text-destructive">{errors.cpf}</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>
                  Telefones {!isStudentMinor && '*'}
                </Label>
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

              {isStudentMinor && (
                <p className="text-xs text-muted-foreground">
                  Para menores de idade, o telefone do aluno é opcional. Você pode adicionar apenas o telefone do responsável na próxima etapa.
                </p>
              )}

              {(formData.student?.phones || ['']).map((phone, index) => (
                <div key={index} className="flex gap-2">
                  <InputPhone
                    value={phone}
                    onChange={(value) => {
                      const phones = [...(formData.student?.phones || [''])];
                      phones[index] = value;
                      updateFormData({ student: { phones } });
                      
                      // Limpa erro de telefone se preencher
                      if (errors.phones && value.trim()) {
                        setErrors(prev => {
                          const { phones, ...rest } = prev;
                          return rest;
                        });
                      }
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
              {errors.phones && (
                <p className="text-sm text-destructive">{errors.phones}</p>
              )}
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
                  
                  // Limpa erro ao digitar
                  if (errors.studentEmail || errors.email) {
                    setErrors(prev => {
                      const { studentEmail, email, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                onBlur={async () => {
                  const email = formData.student?.email;
                  if (email && !validateEmail(email)) {
                    const result = await checkDuplicates({ email }, student?.id);
                    if (result.hasBlocking) {
                      const issue = result.blockingIssues.find(i => i.field === 'email');
                      if (issue) {
                        setErrors(prev => ({ ...prev, email: issue.message }));
                        toast.error(issue.message);
                      }
                    }
                  }
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
                  <div className="flex gap-2">
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
                      onBlur={(e) => {
                        const digits = onlyDigits(e.target.value);
                        if (digits.length === 8) {
                          fetchAddressByCep(e.target.value);
                        }
                      }}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const cep = formData.student?.address?.zip;
                        if (cep) {
                          fetchAddressByCep(cep);
                        } else {
                          toast.error('Digite um CEP válido');
                        }
                      }}
                      title="Buscar endereço pelo CEP"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Digite o CEP e pressione Tab ou clique no botão para buscar automaticamente
                  </p>
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
                onChange={(e) => {
                  updateFormData({ 
                    student: { enrollmentNumber: sanitizeString(e.target.value, 50) }
                  });
                  
                  // Limpa erro ao digitar
                  if (errors.enrollment) {
                    setErrors(prev => {
                      const { enrollment, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                onBlur={async () => {
                  const enrollment = formData.student?.enrollmentNumber;
                  if (enrollment) {
                    const result = await checkDuplicates({ enrollmentNumber: enrollment }, student?.id);
                    if (result.hasBlocking) {
                      const issue = result.blockingIssues.find(i => i.field === 'enrollment_number');
                      if (issue) {
                        setErrors(prev => ({ ...prev, enrollment: issue.message }));
                        toast.error(issue.message);
                      }
                    }
                  }
                }}
                placeholder="Ex: 2024001"
                maxLength={50}
                className={errors.enrollment ? 'border-destructive' : ''}
              />
              {errors.enrollment && (
                <p className="text-sm text-destructive">{errors.enrollment}</p>
              )}
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
              <Label>
                Responsáveis {isStudentMinor && '*'}
              </Label>
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
            
            {/* Badge de detecção de responsável duplicado */}
            {siblingCandidates.length > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
                <Users className="h-5 w-5 text-amber-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    Possível Parente Detectado
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Encontramos alunos com o mesmo responsável
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSiblingSuggestion(true)}
                  className="border-amber-500/50 hover:bg-amber-500/20"
                >
                  Ver Sugestão
                </Button>
              </div>
            )}
            
            {isStudentMinor && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Atenção:</strong> Para alunos menores de idade, é obrigatório cadastrar ao menos um responsável com nome e telefone.
                </p>
              </div>
            )}
            
            {errors.guardians && (
              <p className="text-sm text-destructive">{errors.guardians}</p>
            )}

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
                    <Label>Nome {isStudentMinor && '*'}</Label>
                    <Input
                      value={guardian.name}
                      onChange={(e) => {
                        updateGuardian(index, { name: sanitizeString(e.target.value, 100) });
                        
                        // Limpa erro se preencher
                        if (errors.guardians && e.target.value.trim()) {
                          setErrors(prev => {
                            const { guardians, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                      placeholder="Nome completo"
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Parentesco {isStudentMinor && '*'}</Label>
                    <Select
                      value={guardian.relation}
                      onValueChange={(value) => updateGuardian(index, { relation: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          👨‍👩‍👧 Responsáveis Legais
                        </div>
                        {RELATION_OPTIONS.filter(opt => opt.category === 'legal').map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                        
                        <div className="border-t my-1.5" />
                        
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          👪 Família Estendida
                        </div>
                        {RELATION_OPTIONS.filter(opt => opt.category === 'extended').map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                        
                        <div className="border-t my-1.5" />
                        
                        {RELATION_OPTIONS.filter(opt => opt.category === 'other').map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Telefone {isStudentMinor && '*'}</Label>
                    <InputPhone
                      value={guardian.phone}
                      onChange={(value) => {
                        updateGuardian(index, { phone: value });
                        
                        // Limpa erro se preencher
                        if (errors.guardians && value.trim()) {
                          setErrors(prev => {
                            const { guardians, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                      onBlur={async () => {
                        // Verificar se telefone do responsável já existe
                        const phone = guardian.phone?.trim();
                        if (!phone || phone.replace(/\D/g, '').length < 10 || student?.id) {
                          return; // Não valida telefones incompletos ou edição
                        }

                        const candidates = await checkGuardianDuplicates(undefined, phone);
                        
                        if (candidates.length > 0) {
                          showGuardianDuplicateWarning(candidates);
                        }
                      }}
                      placeholder="(00) 00000-0000"
                      error={errors[`guardian_phone${index}`]}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={guardian.email}
                      onChange={(e) => updateGuardian(index, { email: sanitizeString(e.target.value.toLowerCase(), 255) })}
                      onBlur={async () => {
                        // Verificar se email do responsável já existe
                        const email = guardian.email?.trim();
                        if (!email || !email.includes('@') || student?.id) {
                          return; // Não valida se estiver editando aluno existente
                        }

                        const candidates = await checkGuardianDuplicates(email, undefined);
                        
                        if (candidates.length > 0) {
                          showGuardianDuplicateWarning(candidates);
                        }
                      }}
                      placeholder="email@exemplo.com"
                      maxLength={255}
                      className={errors[`guardian_email${index}`] ? 'border-destructive' : ''}
                    />
                    {errors[`guardian_email${index}`] && (
                      <p className="text-xs text-destructive">{errors[`guardian_email${index}`]}</p>
                    )}
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
              
              <div className="flex items-center gap-2 mb-3">
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
                <Label htmlFor="consent-image" className="cursor-pointer font-normal">
                  Autorizo o uso de imagem
                </Label>
              </div>

              <div className="flex items-center gap-2 mb-3">
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
                <Label htmlFor="consent-fieldtrip" className="cursor-pointer font-normal">
                  Autorizo participação em saídas pedagógicas
                </Label>
              </div>

              <div className="flex items-center gap-2">
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
                <Label htmlFor="consent-whatsapp" className="cursor-pointer font-normal">
                  Autorizo contato via WhatsApp
                </Label>
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
                  Gerar Nova Senha
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

            <h3 className="text-lg font-semibold mt-6 mb-4">Revisão dos Dados</h3>
            
            <div className="space-y-3">
              <div className="rounded-lg border bg-card p-4">
                <h4 className="font-medium mb-3 text-base">Dados Pessoais</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Nome:</span> <span className="font-medium">{formData.name}</span></p>
                  <p><span className="text-muted-foreground">Data de Nascimento:</span> <span className="font-medium">{
                    formData.student?.dob ? 
                      format(new Date(formData.student.dob), "dd/MM/yyyy") : 
                      'Não informado'
                  }</span></p>
                  {isStudentMinor && <Badge variant="secondary" className="mt-2">Menor de idade</Badge>}
                </div>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <h4 className="font-medium mb-3 text-base">Contato</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Telefones:</span> <span className="font-medium">{formData.student?.phones?.filter(p => p.trim()).join(', ') || 'Nenhum'}</span></p>
                  <p><span className="text-muted-foreground">Email:</span> <span className="font-medium">{formData.student?.email || 'Não informado'}</span></p>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <h4 className="font-medium mb-3 text-base">Acadêmico</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Programa:</span> <span className="font-medium">{
                    programs.find(p => p.id === formData.student?.programId)?.name || 'Não selecionado'
                  }</span></p>
                  <p><span className="text-muted-foreground">Nível:</span> <span className="font-medium">{
                    levels.find(l => l.id === formData.student?.levelId)?.name || 'Não selecionado'
                  }</span></p>
                  <p><span className="text-muted-foreground">Turmas:</span> <span className="font-medium">{
                    formData.student?.classIds?.length ? 
                      classes
                        .filter(c => formData.student?.classIds?.includes(c.id))
                        .map(c => c.name)
                        .join(', ') : 
                      'Nenhuma'
                  }</span></p>
                </div>
              </div>

              {isStudentMinor && formData.student?.guardians?.length && (
                <div className="rounded-lg border bg-card p-4">
                  <h4 className="font-medium mb-3 text-base">Responsáveis</h4>
                  <div className="space-y-3">
                    {formData.student.guardians.map((guardian) => (
                      <div key={guardian.id} className="text-sm">
                        <p className="font-medium flex items-center gap-2">
                          {guardian.name}
                          <span className="text-muted-foreground font-normal">- {
                            RELATION_OPTIONS.find(r => r.value === guardian.relation)?.label
                          }</span>
                          {guardian.isPrimary && <Badge variant="default" className="text-xs">Principal</Badge>}
                        </p>
                        <p className="text-muted-foreground mt-1">
                          {guardian.phone} {guardian.email && `• ${guardian.email}`}
                        </p>
                      </div>
                    ))}
                  </div>
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
        <div className="flex items-start justify-between mb-8 px-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center gap-2 flex-1 relative",
                  index !== 0 && "before:absolute before:right-[calc(50%+1.5rem)] before:top-4 before:h-0.5 before:w-[calc(100%-3rem)] before:bg-border"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors z-10 bg-background",
                    isActive && "border-primary bg-primary text-primary-foreground",
                    isCompleted && "border-primary bg-primary/10 text-primary",
                    !isActive && !isCompleted && "border-muted-foreground/25"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className={cn(
                  "text-xs text-center leading-tight max-w-[80px]",
                  isActive && "text-primary font-medium",
                  !isActive && "text-muted-foreground"
                )}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="px-1">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6 mt-6 border-t">
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

          <div className="flex gap-3">
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
                disabled={isChecking || loading}
                className="gap-2"
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
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
    
    {/* Modal de Alertas de Duplicatas */}
    <Dialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {duplicateCheck?.hasBlocking ? 'Dados Duplicados' : 'Possíveis Duplicatas Detectadas'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <DuplicateWarning
            issues={[
              // Blocking issues primeiro
              ...(duplicateCheck?.blockingIssues || []).map((issue: any) => ({
                type: 'blocking' as const,
                field: mapFieldType(issue.field),
                message: issue.field === 'cpf' 
                  ? '🚫 Este CPF já está cadastrado no sistema. Use um documento válido.'
                  : issue.field === 'enrollment_number'
                  ? '🚫 Esta matrícula já está sendo utilizada. Use um número único.'
                  : issue.field === 'email'
                  ? '🚫 Este email já está cadastrado no sistema. Use outro email.'
                  : '🚫 Estes dados já pertencem a outro aluno no sistema.',
                existingUsers: issue.existingUser ? [issue.existingUser] : []
              })),
              // Similarities depois (filtrando emails)
              ...(duplicateCheck?.similarities || [])
                .filter((sim: any) => sim.type !== 'email')
                .map((sim: any) => {
                  const simType: 'critical' | 'info' = sim.severity === 'high' ? 'critical' : 'info';
                  return {
                    type: simType,
                    field: mapFieldType(sim.type),
                    message: sim.type === 'name_dob'
                      ? '⚠️ Nome e data de nascimento idênticos. Isto pode indicar uma duplicata.'
                      : sim.type === 'name'
                      ? '⚠️ Nome muito similar encontrado. Pode ser homônimo ou erro de digitação.'
                      : sim.type === 'phone'
                      ? 'ℹ️ Telefone similar detectado. Pode indicar irmãos ou responsáveis compartilhados.'
                      : 'ℹ️ Informações similares encontradas. Pode indicar irmãos morando no mesmo endereço.',
                    existingUsers: sim.existingUsers
                  };
                })
            ]}
            hasBlocking={duplicateCheck?.hasBlocking || false}
            onCancel={() => setShowDuplicateModal(false)}
            onConfirm={duplicateCheck?.hasBlocking ? undefined : () => {
              setUserConfirmedDuplicates(true);
              setShowDuplicateModal(false);
              setTimeout(() => handleSubmit(), 100);
            }}
            showActions={true}
          />
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal de Sugestão de Responsáveis de Irmãos */}
    <SiblingGuardianSuggestion
      open={showSiblingSuggestion}
      onOpenChange={setShowSiblingSuggestion}
      similarStudents={siblingCandidates}
      currentStudentGuardians={(formData.student?.guardians || []).map(g => ({
        ...g,
        isPrimary: g.isPrimary || false
      }))}
      onCopyGuardians={handleCopyGuardians}
    />
    </>
  );
}
