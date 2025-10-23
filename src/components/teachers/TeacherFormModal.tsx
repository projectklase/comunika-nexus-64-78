import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputPhone } from '@/components/ui/input-phone';
import { TextareaWithCounter } from '@/components/ui/textarea-with-counter';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useTeachers } from '@/hooks/useTeachers';
import { useClassStore } from '@/stores/class-store';
import { useSubjects } from '@/hooks/useSubjects';
import { Person, TeacherExtra } from '@/types/class';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validatePhone, validateEmail, validateBio } from '@/lib/validation';
import { CredentialsDialog } from '@/components/students/CredentialsDialog';

const teacherSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(120, 'Nome muito longo'),
  document: z.string().optional(),
  email: z.string().min(1, 'E-mail é obrigatório').refine((val) => {
    return validateEmail(val) === null;
  }, 'E-mail inválido'),
  password: z.string().optional().refine((val) => {
    if (!val || val.length === 0) return true;
    return val.length >= 6;
  }, 'Senha deve ter no mínimo 6 caracteres'),
  phones: z.array(z.string()).optional().refine((phones) => {
    if (!phones || phones.length === 0) return true;
    return phones.every(phone => validatePhone(phone) === null);
  }, 'Um ou mais telefones são inválidos'),
  photoUrl: z.string().optional(),
  hiredAt: z.date().optional(),
  bio: z.string().optional().refine((bio) => {
    if (!bio) return true;
    return validateBio(bio) === null;
  }, 'Bio muito longa (máx. 1.000 caracteres)'),
  qualifications: z.array(z.string()).optional(),
  specialties: z.array(z.string()).optional(),
  workloadHours: z.number().optional(),
  classIds: z.array(z.string()).optional(),
  availability: z.object({
    daysOfWeek: z.array(z.string()).optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  }).optional(),
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    district: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  }).optional(),
  consents: z.object({
    image: z.boolean().optional(),
    whatsapp: z.boolean().optional(),
  }).optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.availability?.daysOfWeek?.length && data.availability?.startTime && data.availability?.endTime) {
    return data.availability.endTime > data.availability.startTime;
  }
  return true;
}, {
  message: "Horário final deve ser maior que o inicial quando dias estão preenchidos",
  path: ["availability", "endTime"],
});

type TeacherFormData = z.infer<typeof teacherSchema>;

interface TeacherFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: Person | null;
}

const STEPS = [
  { id: 1, title: 'Dados Básicos' },
  { id: 2, title: 'Acadêmico e Atuação' },
  { id: 3, title: 'Disponibilidade e Outros' },
];

const DAYS_OF_WEEK = [
  { value: 'Segunda', label: 'Segunda' },
  { value: 'Terça', label: 'Terça' },
  { value: 'Quarta', label: 'Quarta' },
  { value: 'Quinta', label: 'Quinta' },
  { value: 'Sexta', label: 'Sexta' },
  { value: 'Sábado', label: 'Sábado' },
  { value: 'Domingo', label: 'Domingo' },
];

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function TeacherFormModal({ open, onOpenChange, teacher }: TeacherFormModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [newPhone, setNewPhone] = useState('');
  const [newQualification, setNewQualification] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState({ name: '', email: '', password: '' });
  
  const { createTeacher, updateTeacher } = useTeachers();
  const { classes, updateClass } = useClassStore();
  const { subjects } = useSubjects();
  const { toast } = useToast();

  const form = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      name: '',
      phones: [],
      qualifications: [],
      specialties: [],
      classIds: [],
      availability: { daysOfWeek: [] },
      address: {},
      consents: { image: false, whatsapp: false },
    },
  });

  // Load teacher data for editing
  useEffect(() => {
    if (open) {
      setCurrentStep(0); // Reset step when modal opens
      if (teacher) {
        const teacherData = teacher.teacher || {};
        form.reset({
          name: teacher.name,
          document: teacherData.document,
          email: teacherData.email || teacher.email,
          phones: teacherData.phones || [],
          photoUrl: teacherData.photoUrl,
          hiredAt: teacherData.hiredAt ? new Date(teacherData.hiredAt) : undefined,
          bio: teacherData.bio,
          qualifications: teacherData.qualifications || [],
          specialties: teacherData.specialties || [],
          workloadHours: teacherData.workloadHours,
          classIds: teacherData.classIds || [],
          availability: teacherData.availability || { daysOfWeek: [] },
          address: teacherData.address || {},
          consents: teacherData.consents || { image: false, whatsapp: false },
          notes: teacherData.notes,
        });
      } else {
        form.reset({
          name: '',
          phones: [],
          qualifications: [],
          specialties: [],
          classIds: [],
          availability: { daysOfWeek: [] },
          address: {},
          consents: { image: false, whatsapp: false },
        });
      }
    }
  }, [teacher, open, form]);

  const activeClasses = classes.filter(c => c.status === 'ATIVA')
    .sort((a, b) => {
      // Sort by days and time
      const aDay = a.daysOfWeek[0] || 'ZZZ';
      const bDay = b.daysOfWeek[0] || 'ZZZ';
      if (aDay !== bDay) return aDay.localeCompare(bDay);
      return a.startTime.localeCompare(b.startTime);
    });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Only allow submit on step 3
    if (currentStep !== 2) return;
    
    setIsLoading(true);
    try {
      const data = form.getValues();
      const teacherData: TeacherExtra = {
        document: data.document,
        phones: data.phones,
        email: data.email,
        photoUrl: data.photoUrl,
        bio: data.bio,
        qualifications: data.qualifications,
        specialties: data.specialties,
        workloadHours: data.workloadHours,
        availability: data.availability,
        address: data.address,
        consents: data.consents,
        classIds: data.classIds,
        hiredAt: data.hiredAt ? data.hiredAt.toISOString() : undefined,
        notes: data.notes,
      };

      if (teacher) {
        // Atualizando professor existente
        const updates: any = {
          name: data.name,
          email: data.email,
        };
        
        // Only include password if it was provided
        if (data.password && data.password.trim().length > 0) {
          updates.password = data.password;
        }
        
        await updateTeacher(teacher.id, updates);

        // Update class enrollments
        if (data.classIds) {
          const previousClassIds = teacher.teacher?.classIds || [];
          
          // Remove from classes that are no longer selected
          for (const classId of previousClassIds) {
            if (!data.classIds.includes(classId)) {
              const classToUpdate = classes.find(c => c.id === classId);
              if (classToUpdate) {
                const updatedTeachers = classToUpdate.teachers.filter(id => id !== teacher.id);
                await updateClass(classId, { teachers: updatedTeachers });
              }
            }
          }
          
          // Add to new classes
          for (const classId of data.classIds) {
            if (!previousClassIds.includes(classId)) {
              const classToUpdate = classes.find(c => c.id === classId);
              if (classToUpdate && !classToUpdate.teachers.includes(teacher.id)) {
                const updatedTeachers = [...classToUpdate.teachers, teacher.id];
                await updateClass(classId, { teachers: updatedTeachers });
              }
            }
          }
        }

        toast({
          title: "Professor atualizado",
          description: "As informações do professor foram atualizadas com sucesso.",
        });
      } else {
        // Create new teacher - usando apenas os dados básicos
        const result = await createTeacher({
          name: data.name,
          email: data.email,
        });

        // Mostrar credenciais após criação
        if (result?.password) {
          setCredentials({
            name: data.name,
            email: data.email,
            password: result.password
          });
          setShowCredentials(true);
        }
      }

      setIsLoading(false);
      onOpenChange(false);
      setCurrentStep(0);
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o professor. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (currentStep === 0) {
      if (!form.getValues('name')?.trim()) {
        form.setError('name', { type: 'required', message: 'Nome é obrigatório' });
        return;
      }
      if (!form.getValues('email')?.trim()) {
        form.setError('email', { type: 'required', message: 'E-mail é obrigatório' });
        return;
      }
    }
    
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getCurrentStepFields = (): (keyof TeacherFormData)[] => {
    switch (currentStep) {
      case 0:
        return ['name']; // Only name is required in step 1
      case 1:
        return []; // No required fields in step 2
      case 2:
        return ['availability']; // Validate availability in step 3
      default:
        return [];
    }
  };

  const addPhone = () => {
    if (newPhone.trim() && validatePhone(newPhone) === null) {
      const currentPhones = form.getValues('phones') || [];
      form.setValue('phones', [...currentPhones, newPhone.trim()]);
      setNewPhone('');
    }
  };

  const removePhone = (index: number) => {
    const currentPhones = form.getValues('phones') || [];
    form.setValue('phones', currentPhones.filter((_, i) => i !== index));
  };

  const addQualification = () => {
    if (newQualification.trim()) {
      const currentQualifications = form.getValues('qualifications') || [];
      form.setValue('qualifications', [...currentQualifications, newQualification.trim()]);
      setNewQualification('');
    }
  };

  const removeQualification = (index: number) => {
    const currentQualifications = form.getValues('qualifications') || [];
    form.setValue('qualifications', currentQualifications.filter((_, i) => i !== index));
  };

  const addSpecialty = (specialty: string) => {
    const currentSpecialties = form.getValues('specialties') || [];
    if (!currentSpecialties.includes(specialty)) {
      form.setValue('specialties', [...currentSpecialties, specialty]);
    }
  };

  const addCustomSpecialty = () => {
    if (newSpecialty.trim()) {
      addSpecialty(newSpecialty.trim());
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (specialty: string) => {
    const currentSpecialties = form.getValues('specialties') || [];
    form.setValue('specialties', currentSpecialties.filter(s => s !== specialty));
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome *</FormLabel>
            <FormControl>
              <Input placeholder="Nome completo" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="document"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Documento</FormLabel>
            <FormControl>
              <Input placeholder="CPF, RG ou outro documento" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>E-mail *</FormLabel>
            <FormControl>
              <Input type="email" placeholder="email@exemplo.com" {...field} required />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {teacher && (
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nova Senha (opcional)</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder="Deixe em branco para manter a senha atual" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground">
                Preencha apenas se desejar alterar a senha do professor
              </p>
            </FormItem>
          )}
        />
      )}

      <div className="space-y-2">
        <Label>Telefones</Label>
        <div className="flex gap-2">
          <InputPhone
            placeholder="(11) 99999-9999"
            value={newPhone}
            onChange={setNewPhone}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPhone())}
            showError={false}
          />
          <Button 
            type="button" 
            variant="outline" 
            onClick={addPhone}
            disabled={!newPhone.trim() || validatePhone(newPhone) !== null}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(form.watch('phones') || []).map((phone, index) => (
            <Badge key={index} variant="secondary" className="gap-1">
              {phone}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removePhone(index)} />
            </Badge>
          ))}
        </div>
      </div>

      <FormField
        control={form.control}
        name="photoUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>URL da Foto</FormLabel>
            <FormControl>
              <Input placeholder="https://exemplo.com/foto.jpg" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="hiredAt"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Data de Admissão</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value ? (
                      format(field.value, "dd/MM/yyyy")
                    ) : (
                      <span>Selecionar data</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Especialidades</Label>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {subjects.map((subject) => (
              <Button
                key={subject.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSpecialty(subject.name)}
                disabled={(form.watch('specialties') || []).includes(subject.name)}
              >
                {subject.name}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Especialidade personalizada"
              value={newSpecialty}
              onChange={(e) => setNewSpecialty(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSpecialty())}
            />
            <Button type="button" variant="outline" onClick={addCustomSpecialty}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(form.watch('specialties') || []).map((specialty, index) => (
            <Badge key={index} variant="default" className="gap-1">
              {specialty}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeSpecialty(specialty)} />
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Qualificações</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Ex: Mestrado em Educação"
            value={newQualification}
            onChange={(e) => setNewQualification(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addQualification())}
          />
          <Button type="button" variant="outline" onClick={addQualification}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(form.watch('qualifications') || []).map((qualification, index) => (
            <Badge key={index} variant="secondary" className="gap-1">
              {qualification}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeQualification(index)} />
            </Badge>
          ))}
        </div>
      </div>

      <FormField
        control={form.control}
        name="workloadHours"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Carga Horária Semanal</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="40"
                {...field}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="classIds"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Vincular às Turmas (opcional)</FormLabel>
            <div className="space-y-2">
              {activeClasses.map((schoolClass) => (
                <div key={schoolClass.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`class-${schoolClass.id}`}
                    checked={(field.value || []).includes(schoolClass.id)}
                    onCheckedChange={(checked) => {
                      const currentClassIds = field.value || [];
                      if (checked) {
                        field.onChange([...currentClassIds, schoolClass.id]);
                      } else {
                        field.onChange(currentClassIds.filter(id => id !== schoolClass.id));
                      }
                    }}
                  />
                  <Label htmlFor={`class-${schoolClass.id}`} className="text-sm">
                    {schoolClass.name} {schoolClass.code && `(${schoolClass.code})`} - 
                    {schoolClass.daysOfWeek.join(', ')} {schoolClass.startTime}-{schoolClass.endTime}
                  </Label>
                </div>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="bio"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Biografia (máx. 1.000 caracteres)</FormLabel>
            <FormControl>
              <TextareaWithCounter 
                placeholder="Breve descrição sobre o professor" 
                value={field.value || ''}
                onChange={field.onChange}
                maxLength={1000}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Disponibilidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="availability.daysOfWeek"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dias da Semana</FormLabel>
                <div className="grid grid-cols-2 gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={(field.value || []).includes(day.value)}
                        onCheckedChange={(checked) => {
                          const currentDays = field.value || [];
                          if (checked) {
                            field.onChange([...currentDays, day.value]);
                          } else {
                            field.onChange(currentDays.filter(d => d !== day.value));
                          }
                        }}
                      />
                      <Label htmlFor={`day-${day.value}`} className="text-sm">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="availability.startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário Início</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="availability.endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário Fim</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Endereço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="address.zip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP</FormLabel>
                  <FormControl>
                    <Input placeholder="00000-000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address.state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select value={field.value || ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="address.street"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rua</FormLabel>
                <FormControl>
                  <Input placeholder="Nome da rua" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="address.number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número</FormLabel>
                  <FormControl>
                    <Input placeholder="123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address.district"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do bairro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address.city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da cidade" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Consentimentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="consents.image"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel>Consentimento para uso de imagem</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="consents.whatsapp"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel>Consentimento para WhatsApp</FormLabel>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Observações Internas (máx. 1.000 caracteres)</FormLabel>
            <FormControl>
              <TextareaWithCounter 
                placeholder="Observações para uso interno" 
                value={field.value || ''}
                onChange={field.onChange}
                maxLength={1000}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  return (
    <>
    <Dialog open={open} onOpenChange={(newOpen) => !isLoading && onOpenChange(newOpen)}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => isLoading && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {teacher ? 'Editar Professor' : 'Novo Professor'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Stepper */}
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    currentStep >= (step.id - 1)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {step.id}
                </div>
                <span className={cn(
                  "ml-2 text-sm",
                  currentStep >= (step.id - 1) ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.title}
                </span>
                {index < STEPS.length - 1 && (
                  <div className="mx-4 h-px bg-border flex-1" />
                )}
              </div>
            ))}
          </div>

          <Form {...form}>
            <form 
              onSubmit={onSubmit} 
              className="space-y-6"
              onKeyDown={(e) => {
                if (currentStep < 2 && e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
            >
              {currentStep === 0 && renderStep1()}
              {currentStep === 1 && renderStep2()}
              {currentStep === 2 && renderStep3()}

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentStep === 0 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Anterior
                </Button>

                {currentStep < 2 ? (
                  <Button type="button" onClick={handleNext} disabled={isLoading}>
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Salvando...' : teacher ? 'Atualizar' : 'Criar'} Professor
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>

    <CredentialsDialog
      open={showCredentials}
      onOpenChange={setShowCredentials}
      name={credentials.name}
      email={credentials.email}
      password={credentials.password}
      role="professor"
    />
    </>
  );
}