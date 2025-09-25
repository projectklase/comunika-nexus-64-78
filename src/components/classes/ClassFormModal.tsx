import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useClassStore } from '@/stores/class-store';
import { useGlobalLevelStore } from '@/stores/global-level-store';
import { useGlobalModalityStore } from '@/stores/global-modality-store';
import { useGlobalSubjectStore } from '@/stores/global-subject-store';
import { SchoolClass } from '@/types/class';
import { hasCatalogs, getMissingCatalogs } from '@/utils/catalog-guards';
import { saveDraft, restoreDraft, clearDraft } from '@/utils/form-draft';
import { CatalogEmptyState } from './CatalogEmptyState';
import { QuickCreateLevelSheet } from './QuickCreateLevelSheet';
import { QuickCreateModalitySheet } from './QuickCreateModalitySheet';
import { QuickCreateSubjectSheet } from './QuickCreateSubjectSheet';
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
}

export function ClassFormModal({ open, onOpenChange, schoolClass }: ClassFormModalProps) {
  const [showLevelSheet, setShowLevelSheet] = useState(false);
  const [showModalitySheet, setShowModalitySheet] = useState(false);
  const [showSubjectSheet, setShowSubjectSheet] = useState(false);
  
  const { toast } = useToast();
  const { createClass, updateClass, classes } = useClassStore();
  const { levels, loadLevels, getActiveLevels } = useGlobalLevelStore();
  const { modalities, loadModalities, getActiveModalities } = useGlobalModalityStore();
  const { subjects, loadSubjects, getActiveSubjects } = useGlobalSubjectStore();

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

  useEffect(() => {
    loadLevels();
    loadModalities();
    loadSubjects();
  }, [loadLevels, loadModalities, loadSubjects]);

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

      const classData = {
        name: data.name,
        code: data.code || undefined,
        daysOfWeek: data.daysOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        levelId: data.levelId,
        modalityId: data.modalityId,
        subjectIds: data.subjectIds || [],
        grade: data.grade || undefined,
        year: data.year,
        status: data.status,
        teachers: schoolClass?.teachers || [],
        students: schoolClass?.students || [],
      };

      if (schoolClass) {
        await updateClass(schoolClass.id, classData);
        toast({
          title: "Turma atualizada",
          description: "A turma foi atualizada com sucesso.",
        });
      } else {
        await createClass(classData);
        toast({
          title: "Turma criada",
          description: "A turma foi criada com sucesso.",
        });
      }

      // Limpar rascunho após salvar
      clearDraft(DRAFT_KEY);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a turma.",
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

  const activeLevels = getActiveLevels();
  const activeModalities = getActiveModalities();
  const activeSubjects = getActiveSubjects();

  // Verificar se há catálogos suficientes
  const catalogsReady = hasCatalogs({ levels: true, modalities: true, subjects: true });
  const missingCatalogs = getMissingCatalogs({ levels: true, modalities: true, subjects: true });

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-card max-w-2xl">
        <DialogHeader>
          <DialogTitle className="gradient-text">
            {schoolClass ? 'Editar Turma' : 'Nova Turma'}
          </DialogTitle>
        </DialogHeader>

        {/* Mostrar empty state se catálogos estão em falta */}
        {!catalogsReady && !schoolClass && (
          <CatalogEmptyState
            missingCatalogs={missingCatalogs}
            onCreateLevel={() => setShowLevelSheet(true)}
            onCreateModality={() => setShowModalitySheet(true)}
            onCreateSubject={() => setShowSubjectSheet(true)}
            onOpenGlobalCatalog={handleOpenGlobalCatalog}
          />
        )}

        {/* Mostrar formulário apenas se catálogos estão prontos ou editando */}
        {(catalogsReady || schoolClass) && (
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="glass-input">
                            <SelectValue placeholder="Selecione o nível" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="glass-card z-50 bg-background">
                          {activeLevels.map(level => (
                            <SelectItem key={level.id} value={level.id}>
                              {level.name} {level.code && `(${level.code})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="glass-input">
                            <SelectValue placeholder="Selecione a modalidade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="glass-card z-50 bg-background">
                          {activeModalities.map(modality => (
                            <SelectItem key={modality.id} value={modality.id}>
                              {modality.name} {modality.code && `(${modality.code})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        subjects={activeSubjects}
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
        onLevelCreated={(levelId) => {
          form.setValue('levelId', levelId);
          setShowLevelSheet(false);
        }}
      />

      <QuickCreateModalitySheet
        open={showModalitySheet}
        onOpenChange={setShowModalitySheet}
        onModalityCreated={(modalityId) => {
          form.setValue('modalityId', modalityId);
          setShowModalitySheet(false);
        }}
      />

      <QuickCreateSubjectSheet
        open={showSubjectSheet}
        onOpenChange={setShowSubjectSheet}
        onSubjectCreated={(subjectId) => {
          // Adicionar a nova matéria ao array de matérias selecionadas
          const currentSubjects = form.getValues('subjectIds') || [];
          form.setValue('subjectIds', [...currentSubjects, subjectId]);
          setShowSubjectSheet(false);
        }}
      />
    </>
  );
}