import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useClasses } from '@/hooks/useClasses';
import { useLevels } from '@/hooks/useLevels';
import { useModalities } from '@/hooks/useModalities';
import { useSubjects } from '@/hooks/useSubjects';
import { useSchool } from '@/contexts/SchoolContext';
import { SchoolClass } from '@/types/class';
import { useCatalogGuards } from '@/utils/catalog-guards';
import { saveDraft, restoreDraft, clearDraft } from '@/utils/form-draft';
import { CatalogEmptyState } from './CatalogEmptyState';
import { QuickCreateLevelSheet } from './QuickCreateLevelSheet';
import { QuickCreateModalitySheet } from './QuickCreateModalitySheet';
import { QuickCreateSubjectSheet } from './QuickCreateSubjectSheet';
import { SmartLevelSelect } from './SmartLevelSelect';
import { SmartModalitySelect } from './SmartModalitySelect';
import { TeacherCombobox } from './TeacherCombobox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SubjectMultiSelect } from './SubjectMultiSelect';
import { DaysOfWeekSelect } from './DaysOfWeekSelect';
import { useToast } from '@/hooks/use-toast';

const grades = [
  '1º ano', '2º ano', '3º ano', '4º ano', '5º ano',
  '6º ano', '7º ano', '8º ano', '9º ano',
  '1º ano EM', '2º ano EM', '3º ano EM'
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 4 }, (_, i) => currentYear - 1 + i);

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().optional(),
  daysOfWeek: z.array(z.string()).min(1, 'Pelo menos um dia deve ser selecionado'),
  startTime: z.string().min(1, 'Horário inicial é obrigatório'),
  endTime: z.string().min(1, 'Horário final é obrigatório'),
  levelId: z.string().min(1, 'Nível é obrigatório'),
  modalityId: z.string().min(1, 'Modalidade é obrigatória'),
  subjectIds: z.array(z.string()).optional(),
  teacherId: z.string().optional(),
  grade: z.string().optional(),
  year: z.number().min(currentYear - 1).max(currentYear + 2).optional(),
  status: z.enum(['ATIVA', 'ARQUIVADA']),
}).refine((data) => {
  // Validar se horário final é maior que inicial quando dias estão selecionados
  if (data.daysOfWeek.length > 0 && data.startTime && data.endTime) {
    const [startHour, startMin] = data.startTime.split(':').map(Number);
    const [endHour, endMin] = data.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return endMinutes > startMinutes;
  }
  return true;
}, {
  message: 'Horário final deve ser maior que o inicial quando dias estão preenchidos',
  path: ['endTime'],
});

type FormData = z.infer<typeof formSchema>;

interface ClassFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolClass?: SchoolClass | null;
  onSuccess?: () => void | Promise<void>;
}

export function ClassFormModal({ open, onOpenChange, schoolClass, onSuccess }: ClassFormModalProps) {
  const [showLevelSheet, setShowLevelSheet] = useState(false);
  const [showModalitySheet, setShowModalitySheet] = useState(false);
  const [showSubjectSheet, setShowSubjectSheet] = useState(false);
  
  const { toast } = useToast();
  const { classes, createClass, updateClass } = useClasses();
  const { currentSchool } = useSchool();
  // Use catalog guards hook
  const { hasCatalogs, getMissingCatalogs } = useCatalogGuards();
  
  const { levels, isLoading: levelsLoading, refetch: refetchLevels } = useLevels();
  const { modalities, isLoading: modalitiesLoading, refetch: refetchModalities } = useModalities();
  const { subjects, isLoading: subjectsLoading, refetch: refetchSubjects } = useSubjects();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      daysOfWeek: [],
      startTime: '',
      endTime: '',
      levelId: '',
      modalityId: '',
      subjectIds: [],
      teacherId: '',
      grade: '',
      year: currentYear,
      status: 'ATIVA',
    },
  });

  const DRAFT_KEY = 'class_form';
  
  // Auto-save draft
  const formValues = form.watch();
  useEffect(() => {
    if (open && !schoolClass) {
      const timeoutId = setTimeout(() => {
        saveDraft(DRAFT_KEY, formValues);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [formValues, open, schoolClass]);

  // Filter only active items from Supabase
  const activeLevels = levels.filter(l => l.is_active);
  const activeModalities = modalities.filter(m => m.is_active);
  const activeSubjects = subjects.filter(s => s.is_active);
  
  const isLoadingCatalog = levelsLoading || modalitiesLoading || subjectsLoading;

  useEffect(() => {
    if (schoolClass) {
      form.reset({
        name: schoolClass.name,
        code: schoolClass.code || '',
        daysOfWeek: schoolClass.daysOfWeek || [],
        startTime: schoolClass.startTime || '',
        endTime: schoolClass.endTime || '',
        levelId: schoolClass.levelId || '',
        modalityId: schoolClass.modalityId || '',
        subjectIds: schoolClass.subjectIds || [],
        grade: schoolClass.grade || '',
        year: schoolClass.year || currentYear,
        status: schoolClass.status,
      });
    } else {
      // Tentar restaurar rascunho
      const draft = restoreDraft<FormData>(DRAFT_KEY);
      if (draft) {
        form.reset(draft);
        toast({
          title: "Rascunho restaurado",
          description: "Seus dados foram restaurados automaticamente.",
        });
      } else {
        form.reset({
          name: '',
          code: '',
          daysOfWeek: [],
          startTime: '',
          endTime: '',
          levelId: '',
          modalityId: '',
          subjectIds: [],
          grade: '',
          year: currentYear,
          status: 'ATIVA',
        });
      }
    }
  }, [schoolClass, form, toast]);


  const onSubmit = async (data: FormData) => {
    // ✅ VALIDAR ESCOLA
    if (!currentSchool) {
      toast({
        title: "Erro",
        description: "Nenhuma escola selecionada.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Validate unique name per year
      const existingClass = classes.find(c => 
        c.name === data.name && 
        c.year === data.year && 
        c.id !== schoolClass?.id
      );
      
      if (existingClass) {
        toast({
          title: "Erro",
          description: "Já existe uma turma com este nome neste ano.",
          variant: "destructive",
        });
        return;
      }

      // Validate unique code
      if (data.code) {
        const existingCode = classes.find(c => 
          c.code === data.code && 
          c.id !== schoolClass?.id
        );
        
        if (existingCode) {
          toast({
            title: "Erro",
            description: "Já existe uma turma com este código.",
            variant: "destructive",
          });
          return;
        }
      }

      // Converter camelCase para snake_case para o Supabase
      const classData = {
        name: data.name,
        code: data.code || undefined,
        week_days: data.daysOfWeek,
        start_time: data.startTime,
        end_time: data.endTime,
        level_id: data.levelId,
        modality_id: data.modalityId,
        main_teacher_id: data.teacherId || undefined,
        series: data.grade || undefined,
        year: data.year || currentYear,
        status: data.status === 'ATIVA' ? 'Ativa' : 'Arquivada',
        school_id: currentSchool.id,  // ✅ ADICIONAR SCHOOL_ID
      };

      console.log('🔵 [ClassFormModal] Dados do formulário:', data);
      console.log('🔵 [ClassFormModal] Dados convertidos para Supabase:', classData);

      const subjectIds = data.subjectIds || [];
      console.log('🔵 [ClassFormModal] SubjectIds:', subjectIds);

      if (schoolClass) {
        console.log('🔵 [ClassFormModal] Atualizando turma:', schoolClass.id);
        await updateClass(schoolClass.id, classData, subjectIds);
        toast({
          title: "Turma atualizada",
          description: "A turma foi atualizada com sucesso.",
        });
      } else {
        console.log('🔵 [ClassFormModal] Criando nova turma');
        await createClass(classData, subjectIds);
        toast({
          title: "Turma criada",
          description: "A turma foi criada com sucesso.",
        });
      }

      // Limpar rascunho após salvar
      clearDraft(DRAFT_KEY);
      
      // ✅ Callback de sucesso ANTES de fechar o modal
      if (onSuccess) {
        console.log('🔄 [ClassFormModal] Executando callback onSuccess...');
        await onSuccess();
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('🔴 [ClassFormModal] Erro ao salvar turma:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível salvar a turma.",
        variant: "destructive",
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !schoolClass) {
      clearDraft(DRAFT_KEY);
    }
    onOpenChange(newOpen);
  };

  const handleOpenGlobalCatalog = () => {
    window.open('/secretaria/cadastros/catalogo', '_blank');
  };

  // Verificar se há catálogos suficientes
  const catalogsReady = activeLevels.length > 0 && activeModalities.length > 0 && activeSubjects.length > 0;
  
  // Determinar quais catálogos estão faltando
  const missingCatalogs = [];
  if (activeLevels.length === 0) {
    missingCatalogs.push({ type: 'level', label: 'Níveis', description: 'Ex: Fundamental I, Médio' });
  }
  if (activeModalities.length === 0) {
    missingCatalogs.push({ type: 'modality', label: 'Modalidades', description: 'Ex: Regular, Integral' });
  }
  if (activeSubjects.length === 0) {
    missingCatalogs.push({ type: 'subject', label: 'Matérias', description: 'Ex: Matemática, Português' });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-card max-w-2xl">
        <DialogHeader>
          <DialogTitle className="gradient-text">
            {schoolClass ? 'Editar Turma' : 'Nova Turma'}
          </DialogTitle>
        </DialogHeader>

        {/* Show loading state while catalog is being loaded */}
        {isLoadingCatalog && !schoolClass && (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">Carregando catálogos...</p>
          </div>
        )}

        {/* Mostrar empty state se catálogos estão em falta */}
        {!isLoadingCatalog && !catalogsReady && !schoolClass && (
          <CatalogEmptyState
            missingCatalogs={missingCatalogs}
            onCreateLevel={() => setShowLevelSheet(true)}
            onCreateModality={() => setShowModalitySheet(true)}
            onCreateSubject={() => setShowSubjectSheet(true)}
            onOpenGlobalCatalog={handleOpenGlobalCatalog}
          />
        )}

        {/* Mostrar formulário apenas se catálogos estão prontos ou editando */}
        {!isLoadingCatalog && (catalogsReady || schoolClass) && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Turma *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: 7ºA" 
                        className="glass-input"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: 7A-2025" 
                        className="glass-input"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="daysOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dias da semana *</FormLabel>
                  <FormControl>
                    <DaysOfWeekSelect
                      selectedDays={field.value || []}
                      onSelectionChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário inicial *</FormLabel>
                    <FormControl>
                      <Input 
                        type="time"
                        className="glass-input"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário final *</FormLabel>
                    <FormControl>
                      <Input 
                        type="time"
                        className="glass-input"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="levelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nível *</FormLabel>
                      <FormControl>
                        <SmartLevelSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          levels={activeLevels}
                          onLevelCreated={() => {
                            toast({
                              title: "Nível criado!",
                              description: "O nível foi criado e selecionado.",
                            });
                          }}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        Define a faixa etária ou ano escolar
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="modalityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modalidade *</FormLabel>
                      <FormControl>
                        <SmartModalitySelect
                          value={field.value}
                          onValueChange={field.onChange}
                          modalities={activeModalities}
                          onModalityCreated={() => {
                            toast({
                              title: "Modalidade criada!",
                              description: "A modalidade foi criada e selecionada.",
                            });
                          }}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        Define a carga horária semanal
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

              <FormField
                control={form.control}
                name="subjectIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Matérias</FormLabel>
                    <FormControl>
                      <SubjectMultiSelect
                        subjects={activeSubjects.map(s => ({
                          id: s.id,
                          name: s.name,
                          code: s.code,
                          description: s.description,
                          isActive: s.is_active,
                          createdAt: s.created_at,
                          updatedAt: s.updated_at,
                        }))}
                        selectedIds={field.value || []}
                        onSelectionChange={field.onChange}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Disciplinas ministradas nesta turma
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo para Professor */}
              <FormField
                control={form.control}
                name="teacherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professor Responsável</FormLabel>
                    <FormControl>
                      <TeacherCombobox
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Selecione um professor..."
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Professor principal desta turma
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Série</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Selecione a série" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass-card z-50 bg-background">
                        {grades.map(grade => (
                          <SelectItem key={grade} value={grade}>
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ano</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Selecione o ano" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass-card z-50 bg-background">
                        {years.map(year => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="glass-input">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glass-card z-50 bg-background">
                      <SelectItem value="ATIVA">Ativa</SelectItem>
                      <SelectItem value="ARQUIVADA">Arquivada</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleOpenChange(false)}
                  className="glass-button"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="glass-button"
                  disabled={!form.formState.isValid}
                >
                  {schoolClass ? 'Atualizar' : 'Criar'} Turma
                </Button>
              </div>
            </form>
          </Form>
        )}
        </DialogContent>
      </Dialog>

      {/* Quick Create Sheets */}
      <QuickCreateLevelSheet
        open={showLevelSheet}
        onOpenChange={setShowLevelSheet}
        onLevelCreated={async (levelId) => {
          form.setValue('levelId', levelId);
          await refetchLevels?.();
          setShowLevelSheet(false);
        }}
      />

      <QuickCreateModalitySheet
        open={showModalitySheet}
        onOpenChange={setShowModalitySheet}
        onModalityCreated={async (modalityId) => {
          form.setValue('modalityId', modalityId);
          await refetchModalities?.();
          setShowModalitySheet(false);
        }}
      />

      <QuickCreateSubjectSheet
        open={showSubjectSheet}
        onOpenChange={setShowSubjectSheet}
        onSubjectCreated={async (subjectId) => {
          // Adicionar a nova matéria ao array de matérias selecionadas
          const currentSubjects = form.getValues('subjectIds') || [];
          form.setValue('subjectIds', [...currentSubjects, subjectId]);
          await refetchSubjects?.();
          setShowSubjectSheet(false);
        }}
      />
    </>
  );
}