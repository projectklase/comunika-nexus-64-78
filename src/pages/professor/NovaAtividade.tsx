import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, useBeforeUnload } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getProfessorClasses } from '@/utils/professor-helpers';
import { postStore } from '@/stores/post-store';
import { useClassStore } from '@/stores/class-store';
import { usePeopleStore } from '@/stores/people-store';
import { ActivityType, ActivityMeta, PostType } from '@/types/post';
import { TeacherActivityDefaults, TeacherPrefsService, DraftService, ActivityDraft } from '@/services/teacher-prefs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputWithCounter } from '@/components/ui/input-with-counter';
import { TextareaWithCounter } from '@/components/ui/textarea-with-counter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ActivityTypeSelector } from '@/components/activities/ActivityTypeSelector';
import { ActivityFields } from '@/components/activities/ActivityFields';
import { ActivityPreviewCard } from '@/components/activities/ActivityPreviewCard';
import { TeacherPreferencesModal } from '@/components/activities/TeacherPreferencesModal';
import { DraftModal } from '@/components/activities/DraftModal';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Save, ArrowLeft } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export default function NovaAtividade() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loadClasses } = useClassStore();
  const { loadPeople } = usePeopleStore();
  
  // Check if we're in edit mode
  const editId = searchParams.get('edit');
  const isEditMode = !!editId;
  
  const [prefs, setPrefs] = useState<TeacherActivityDefaults>(() => 
    user ? TeacherPrefsService.getDefaults(user.id) : TeacherPrefsService.getDefaults('')
  );
  
  const [activityType, setActivityType] = useState<ActivityType>(prefs.defaultType);
  const [allowPastDeadline, setAllowPastDeadline] = useState(false);
  const [activityMeta, setActivityMeta] = useState<ActivityMeta & { usePeso?: boolean }>(() => 
    user ? TeacherPrefsService.getMetaDefaults(prefs.defaultType, prefs) : { peso: 1, usePeso: false }
  );
  
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    classId: searchParams.get('turma') || '',
    dueDate: null as Date | null,
    dueTime: '23:59'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Load data
  useEffect(() => {
    loadClasses();
    loadPeople();
  }, [loadClasses, loadPeople]);

  // Load existing post for editing
  useEffect(() => {
    if (isEditMode && editId) {
      postStore.getById(editId)
        .then(existingPost => {
          if (existingPost) {
            setActivityType(existingPost.type as ActivityType);
            setFormData({
              title: existingPost.title,
              body: existingPost.body || '',
              classId: existingPost.classIds?.[0] || existingPost.classId || '',
              dueDate: existingPost.dueAt ? new Date(existingPost.dueAt) : null,
              dueTime: existingPost.dueAt ? format(new Date(existingPost.dueAt), 'HH:mm') : '23:59'
            });
            if (existingPost.activityMeta) {
              setActivityMeta(existingPost.activityMeta);
            }
            // Remove edit param after loading
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('edit');
            setSearchParams(newParams, { replace: true });
          } else {
            toast({
              title: "Erro",
              description: "Atividade não encontrada para edição.",
              variant: "destructive",
            });
            navigate('/professor/atividades');
          }
        })
        .catch(error => {
          console.error('Erro ao carregar atividade:', error);
          toast({
            title: "Erro ao carregar",
            description: "Não foi possível carregar a atividade. Tente novamente.",
            variant: "destructive",
          });
          navigate('/professor/atividades');
        });
    }
  }, [isEditMode, editId, searchParams, setSearchParams, navigate, toast]);

  if (!user) return null;
  
  const professorClasses = getProfessorClasses(user.id);

  // Track form changes for draft saving
  useEffect(() => {
    const hasFormData = !!(formData.title.trim() || formData.body.trim() || formData.classId);
    setHasChanges(hasFormData);
  }, [formData]);

  // Auto-save draft
  const saveDraft = useCallback(() => {
    if (hasChanges && user) {
      DraftService.saveDraft(user.id, {
        type: activityType,
        title: formData.title,
        body: formData.body,
        classId: formData.classId,
        dueDate: formData.dueDate?.toISOString() || null,
        dueTime: formData.dueTime,
        activityMeta
      });
    }
  }, [hasChanges, user, activityType, formData, activityMeta]);

  // Save draft before unload
  useBeforeUnload(
    useCallback((event) => {
      if (hasChanges) {
        saveDraft();
        event.preventDefault();
        event.returnValue = '';
      }
    }, [hasChanges, saveDraft])
  );

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(saveDraft, 30000);
    return () => clearInterval(interval);
  }, [saveDraft]);

  // Update prefs and apply new defaults
  const handlePrefsUpdate = (newPrefs: TeacherActivityDefaults) => {
    setPrefs(newPrefs);
    // Apply new defaults to current activity if meta is still default
    const newDefaults = TeacherPrefsService.getMetaDefaults(activityType, newPrefs);
    setActivityMeta(prev => ({ ...newDefaults, ...prev }));
  };

  // Load draft
  const handleLoadDraft = (draft: ActivityDraft) => {
    setActivityType(draft.type);
    setFormData({
      title: draft.title,
      body: draft.body,
      classId: draft.classId,
      dueDate: draft.dueDate ? new Date(draft.dueDate) : null,
      dueTime: draft.dueTime
    });
    setActivityMeta(draft.activityMeta);
  };

  // Update meta defaults when activity type changes
  const handleActivityTypeChange = (type: ActivityType) => {
    setActivityType(type);
    const newDefaults = TeacherPrefsService.getMetaDefaults(type, prefs);
    setActivityMeta({ ...activityMeta, ...newDefaults });
  };

  const validateDeadline = () => {
    if (!formData.dueDate || allowPastDeadline) return true;
    
    const deadline = new Date(formData.dueDate.toDateString() + ' ' + formData.dueTime);
    const minDeadline = addMinutes(new Date(), 30);
    
    return deadline >= minDeadline;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.classId) {
      toast({
        title: 'Erro',
        description: 'Título e turma são obrigatórios',
        variant: 'destructive'
      });
      return;
    }

    if (!validateDeadline()) {
      toast({
        title: 'Erro',
        description: 'O prazo deve ser pelo menos 30 minutos no futuro',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const dueAt = formData.dueDate ? 
        new Date(formData.dueDate.toDateString() + ' ' + formData.dueTime).toISOString() :
        undefined;
      
      // Limpar peso se usePeso for false
      const finalMeta = activityMeta.usePeso === false 
        ? { ...activityMeta, peso: undefined, usePeso: false }
        : activityMeta;

      if (isEditMode && editId) {
        // Update existing post
        await postStore.update(editId, {
          type: activityType as PostType,
          title: formData.title,
          body: formData.body || undefined,
          classIds: [formData.classId],
          audience: 'CLASS',
          dueAt,
          activityMeta: finalMeta
        });
      } else {
        // Create new post
        await postStore.create({
          type: activityType as PostType,
          title: formData.title,
          body: formData.body || undefined,
          classIds: [formData.classId],
          audience: 'CLASS',
          dueAt,
          status: 'PUBLISHED',
          activityMeta: finalMeta
        }, user.name, user.id, user.role);
      }
      
      const typeLabel = activityType === 'ATIVIDADE' ? 'Atividade' : 
                       activityType === 'TRABALHO' ? 'Trabalho' : 'Prova';
      
      toast({
        title: 'Sucesso',
        description: `${typeLabel} ${isEditMode ? 'atualizada' : 'criada'} com sucesso!`
      });
      
      navigate('/professor/atividades');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao criar atividade',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="sm" asChild className="min-h-10">
            <Link to="/professor/atividades">
              <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
          </Button>
          
          <div>
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold gradient-text">
              {isEditMode ? 'Editar' : 'Nova'} {activityType === 'ATIVIDADE' ? 'Atividade' : 
                    activityType === 'TRABALHO' ? 'Trabalho' : 'Prova'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              {isEditMode ? 'Edite esta' : 'Crie uma nova'} {activityType.toLowerCase()} para suas turmas
            </p>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <TeacherPreferencesModal userId={user.id} onSave={handlePrefsUpdate} />
          <DraftModal userId={user.id} onLoadDraft={handleLoadDraft} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Formulário */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Informações da {activityType === 'ATIVIDADE' ? 'Atividade' : 
                                       activityType === 'TRABALHO' ? 'Trabalho' : 'Prova'}</CardTitle>
              {hasChanges && (
                <div className="text-xs text-muted-foreground">
                  Rascunho salvo automaticamente
                </div>
              )}
            </div>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <ActivityTypeSelector 
                value={activityType} 
                onChange={handleActivityTypeChange} 
              />
            </div>

            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <InputWithCounter
                id="title"
                value={formData.title}
                onChange={(value) => setFormData(prev => ({ ...prev, title: value }))}
                placeholder="Ex: Exercícios de Matemática - Capítulo 5"
                maxLength={120}
                required
              />
            </div>

            {/* Turma */}
            <div className="space-y-2">
              <Label htmlFor="class">Turma *</Label>
              <Select 
                value={formData.classId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, classId: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma turma" />
                </SelectTrigger>
                <SelectContent>
                  {professorClasses.map((schoolClass) => (
                    <SelectItem key={schoolClass.id} value={schoolClass.id}>
                      {schoolClass.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {professorClasses.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma turma atribuída. Entre em contato com a secretaria.
                </p>
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="body">Descrição</Label>
              <TextareaWithCounter
                id="body"
                value={formData.body}
                onChange={(value) => setFormData(prev => ({ ...prev, body: value }))}
                placeholder="Descreva a atividade, instruções e critérios de avaliação..."
                maxLength={1000}
                rows={6}
              />
            </div>

            {/* Data e Hora de Entrega */}
            <div className="space-y-4">
              <Label>Entrega & Prazo</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>Data do Prazo *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        {formData.dueDate ? (
                          format(formData.dueDate, "dd/MM/yyyy")
                        ) : (
                          <span>Selecionar data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.dueDate}
                        onSelect={(date) => setFormData(prev => ({ ...prev, dueDate: date }))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dueTime">Hora do Prazo *</Label>
                  <Input
                    id="dueTime"
                    type="time"
                    value={formData.dueTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueTime: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allow-past"
                  checked={allowPastDeadline}
                  onCheckedChange={(checked) => setAllowPastDeadline(checked === true)}
                />
                <Label htmlFor="allow-past" className="text-sm text-muted-foreground">
                  Permitir prazo no passado
                </Label>
              </div>
            </div>

            {/* Campos específicos por tipo */}
            <div className="space-y-4">
              <Label>Configurações Específicas</Label>
              <div className="border rounded-lg p-4">
                <ActivityFields 
                  type={activityType}
                  meta={activityMeta}
                  onChange={setActivityMeta}
                />
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting || professorClasses.length === 0} className="min-h-11 w-full sm:w-auto">
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? (isEditMode ? 'Salvando...' : 'Criando...') : 
                 `${isEditMode ? 'Salvar' : 'Criar'} ${activityType === 'ATIVIDADE' ? 'Atividade' : 
                           activityType === 'TRABALHO' ? 'Trabalho' : 'Prova'}`}
              </Button>
              
              <Button type="button" variant="outline" asChild className="min-h-11 w-full sm:w-auto">
                <Link to="/professor/atividades">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
        </Card>

        {/* Preview - Hidden on mobile, visible on desktop */}
        <div className="space-y-4 hidden lg:block">
          <h3 className="text-lg font-semibold">Preview</h3>
          <ActivityPreviewCard
            type={activityType}
            title={formData.title}
            body={formData.body}
            dueDate={formData.dueDate}
            dueTime={formData.dueTime}
            activityMeta={activityMeta}
          />
        </div>
      </div>
    </div>
  );
}