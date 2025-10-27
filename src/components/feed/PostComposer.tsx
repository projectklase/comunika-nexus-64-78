import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TextareaWithCounter } from '@/components/ui/textarea-with-counter';
import { InputDate } from '@/components/ui/input-date';
import { InputTime } from '@/components/ui/input-time';
import { InputPhone } from '@/components/ui/input-phone';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Calendar, Clock, MapPin, Send, Clock3, X, Plus, Search, Filter, Info, Settings2, Save, Star } from 'lucide-react';
import { PostType, PostInput } from '@/types/post';
import { useToast } from '@/hooks/use-toast';
import { AttachmentUploader, Attachment } from '@/components/files/AttachmentUploader';
import { PostAttachment } from '@/types/post';
import { useAuth } from '@/contexts/AuthContext';
import { useClasses } from '@/hooks/useClasses';
import { useLevels } from '@/hooks/useLevels';
import { useModalities } from '@/hooks/useModalities';
import { useSubjects } from '@/hooks/useSubjects';
import { usePeopleStore } from '@/stores/people-store';
import { orderClassesBySchedule, getClassDisplayInfo, resolveSubjectNames } from '@/utils/class-helpers';
import { validateTitle, validateDescription, clampLen } from '@/lib/validation';
import { formatDateTime } from '@/lib/format';
import { combineDateTime, splitDateTime, formatDateBR, formatTimeBR, isFutureByMargin, isPastWithTolerance } from '@/lib/date-helpers';
import { cn } from '@/lib/utils';
import { useComposerAutosave } from '@/hooks/useComposerAutosave';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { TimezoneHelpers } from '@/utils/timezone-helpers';
import { AuditService } from '@/services/audit-service';
import { TemplateManager } from '@/components/composer/TemplateManager';
import { DraftManager } from '@/components/composer/DraftManager';
import { PreferencesIndicator } from '@/components/composer/PreferencesIndicator';
import { SchedulingSection } from '@/components/composer/SchedulingSection';
import { ComposerActions } from '@/components/composer/ComposerActions';
import { useHolidayWarning } from '@/hooks/useHolidayWarning';
import { useDirtyPrompt } from '@/hooks/useDirtyPrompt';
import { HolidayWarningDialog } from '@/components/ui/holiday-warning-dialog';
import { isHoliday, Holiday } from '@/utils/br-holidays';

interface PostComposerProps {
  allowedTypes: PostType[];
  onSubmit: (post: PostInput) => void;
  initialData?: PostInput & { originalId?: string };
  onCancel?: () => void;
  onCloseAttempt?: () => Promise<boolean>; // New prop for close guard
  isLoading?: boolean;
  preselectedDate?: Date;
  isFromDayFocus?: boolean;
  dayFocusDate?: string;
}

export function PostComposer({ 
  allowedTypes, 
  onSubmit, 
  initialData, 
  onCancel, 
  onCloseAttempt,
  isLoading = false, 
  preselectedDate,
  isFromDayFocus = false,
  dayFocusDate
}: PostComposerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { classes } = useClasses();
  const { levels } = useLevels();
  const { modalities } = useModalities();
  const { subjects } = useSubjects();
  const { people } = usePeopleStore();
  
  // Generate unique temp ID for this composer instance
  const tempId = useRef(initialData?.originalId || `composer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`).current;
  
  // Initialize preferences and autosave
  const { preferences, saveLastChoices } = useUserPreferences();
  
  // Autosave setup
  const {
    saveDraft,
    deleteDraft,
    hasUnsavedChanges,
    getAllDrafts
  } = useComposerAutosave({
    tempId,
    onDraftLoaded: (draft) => {
      // Apply loaded draft data
      setTitle(draft.title || '');
      setBody(draft.body || '');
      setActiveTab(draft.type);
      setAudience(draft.audience);
      setSelectedClassIds(draft.selectedClassIds || []);
      setEventStartDate(draft.eventStartDate || '');
      setEventStartTime(draft.eventStartTime || '');
      setEventEndDate(draft.eventEndDate || '');
      setEventEndTime(draft.eventEndTime || '');
      setEventLocation(draft.eventLocation || '');
      setDueDate(draft.dueDate || '');
      setDueTime(draft.dueTime || '');
      
      toast({
        title: "Rascunho carregado",
        description: "Seus dados foram restaurados automaticamente.",
      });
    },
    onDraftSaved: () => {
      if (user) {
        AuditService.trackComposerAutosave(user.id, {
          hasContent: !!(title.trim() || body.trim()),
          fieldCount: [title, body, eventLocation].filter(f => f.trim()).length
        });
      }
    }
  });
  
  // Load data
  
  const [activeTab, setActiveTab] = useState<PostType>(() => {
    // Priority: initialData -> preferences -> dayFocus hint -> first allowed
    if (initialData?.type) return initialData.type;
    if (preferences?.lastPostType && allowedTypes.includes(preferences.lastPostType)) {
      return preferences.lastPostType;
    }
    if (isFromDayFocus && allowedTypes.includes('EVENTO')) return 'EVENTO';
    return allowedTypes[0];
  });
  
  // Form state
  const [title, setTitle] = useState(initialData?.title || '');
  const [body, setBody] = useState(initialData?.body || '');
  const [audience, setAudience] = useState<'GLOBAL' | 'CLASS'>(
    initialData?.audience || (user?.role === 'professor' ? 'CLASS' : 'GLOBAL')
  );
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(() => {
    // Priority: initialData -> preferences -> empty
    if (initialData?.classIds) return initialData.classIds;
    if (initialData?.classId) return [initialData.classId];
    if (preferences?.lastClassId && preferences.lastClassId !== 'ALL_CLASSES') {
      return [preferences.lastClassId];
    }
    return [];
  });
  const [classSearch, setClassSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('ALL_LEVELS');
  const [modalityFilter, setModalityFilter] = useState<string>('ALL_MODALITIES');
  
  // Event date/time fields (separated) with default 60min duration
  const [eventStartDate, setEventStartDate] = useState(() => {
    if (initialData?.eventStartAt) {
      const { dateStr } = splitDateTime(new Date(initialData.eventStartAt));
      return dateStr;
    }
    if (preselectedDate || dayFocusDate) {
      const date = preselectedDate || new Date(dayFocusDate!);
      const { dateStr } = splitDateTime(date);
      return dateStr;
    }
    return '';
  });
  
  const [eventStartTime, setEventStartTime] = useState(() => {
    if (initialData?.eventStartAt) {
      const { timeStr } = splitDateTime(new Date(initialData.eventStartAt));
      return timeStr;
    }
    // Default to 9:00 AM if creating new event with preselected date
    if ((preselectedDate || dayFocusDate) && !initialData) {
      return '09:00';
    }
    return '';
  });
  
  const [eventEndDate, setEventEndDate] = useState(() => {
    if (initialData?.eventEndAt) {
      const { dateStr } = splitDateTime(new Date(initialData.eventEndAt));
      return dateStr;
    }
    if (preselectedDate || dayFocusDate) {
      const date = preselectedDate || new Date(dayFocusDate!);
      const { dateStr } = splitDateTime(date);
      return dateStr;
    }
    return '';
  });
  
  const [eventEndTime, setEventEndTime] = useState(() => {
    if (initialData?.eventEndAt) {
      const { timeStr } = splitDateTime(new Date(initialData.eventEndAt));
      return timeStr;
    }
    // Default to 10:00 AM (60min duration) if creating new event with preselected date
    if ((preselectedDate || dayFocusDate) && !initialData) {
      return '10:00';
    }
    return '';
  });
  
  // Activity deadline fields (separated)
  const [dueDate, setDueDate] = useState(() => {
    if (initialData?.dueAt) {
      const { dateStr } = splitDateTime(new Date(initialData.dueAt));
      return dateStr;
    }
    if (preselectedDate || dayFocusDate) {
      const date = preselectedDate || new Date(dayFocusDate!);
      const { dateStr } = splitDateTime(date);
      return dateStr;
    }
    return '';
  });
  
  const [dueTime, setDueTime] = useState(() => {
    if (initialData?.dueAt) {
      const { timeStr } = splitDateTime(new Date(initialData.dueAt));
      return timeStr;
    }
    // Default to 23:59 for activity deadlines
    if ((preselectedDate || dayFocusDate) && !initialData) {
      return '23:59';
    }
    return '';
  });
  
  // Publish schedule fields (separated)
  const [publishDate, setPublishDate] = useState('');
  const [publishTime, setPublishTime] = useState('');
  
  const [eventLocation, setEventLocation] = useState(initialData?.eventLocation || '');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [allowPastDeadline, setAllowPastDeadline] = useState(false);
  const [contactPhone, setContactPhone] = useState(initialData?.meta?.contactPhone || '');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [dateTimeErrors, setDateTimeErrors] = useState<Record<string, string>>({});
  const [showPublishNowTooltip, setShowPublishNowTooltip] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showDraftManager, setShowDraftManager] = useState(false);
  const [isImportant, setIsImportant] = useState(initialData?.meta?.important || false);
  const [allowInvitations, setAllowInvitations] = useState(initialData?.allowInvitations || false);

  // Holiday warning hook
  const { warningState, checkDateForHoliday, confirmHoliday, cancelHoliday } = useHolidayWarning();
  
  // Dirty prompt hook for draft-on-close
  const { promptBeforeClose } = useDirtyPrompt({
    isDirty: !!(title.trim() || body.trim() || eventLocation.trim()),
    onSaveAsDraft: () => {
      const currentData = {
        type: activeTab,
        title,
        body,
        audience,
        selectedClassIds,
        eventStartDate,
        eventStartTime,
        eventEndDate,
        eventEndTime,
        eventLocation,
        dueDate,
        dueTime,
        isFromDayFocus,
        dayFocusDate
      };
      saveDraft(currentData);
    },
    onDiscard: () => {
      deleteDraft();
      // Reset form
      setTitle('');
      setBody('');
      setEventLocation('');
      setPublishDate('');
      setPublishTime('');
      setDueDate('');
      setDueTime('');
      setEventStartDate('');
      setEventStartTime('');
      setEventEndDate('');
      setEventEndTime('');
    },
    onContinueEditing: () => {
      // Do nothing, just continue editing
    }
  });

  // Handle close attempt
  useEffect(() => {
    if (onCloseAttempt) {
      // Make the close handler available to parent
      (onCloseAttempt as any).implementation = promptBeforeClose;
    }
  }, [onCloseAttempt, promptBeforeClose]);
  
  // Real-time holiday detection for inline display
  const [currentHolidays, setCurrentHolidays] = useState<{
    eventStart?: Holiday | null;
    eventEnd?: Holiday | null;
    due?: Holiday | null;
  }>({});

  // Get available classes based on user role
  const availableClasses = user?.role === 'professor'
  ? classes.filter(c => c.teachers.includes(user.id))
  : classes.filter(c => c.status === 'ATIVA');

  // Filter and order classes
  const filteredClasses = orderClassesBySchedule(
    availableClasses.filter(cls => {
      // Text search
      const matchesSearch = !classSearch || 
        cls.name.toLowerCase().includes(classSearch.toLowerCase()) ||
        cls.code?.toLowerCase().includes(classSearch.toLowerCase());
      
      // Level filter
      const matchesLevel = levelFilter === 'ALL_LEVELS' || cls.levelId === levelFilter;
      
      // Modality filter  
      const matchesModality = modalityFilter === 'ALL_MODALITIES' || cls.modalityId === modalityFilter;
      
      return matchesSearch && matchesLevel && matchesModality;
    })
  );

  // Get available options for filters
  const availableLevels = levels.filter(l => l.is_active);
  const availableModalities = modalities.filter(m => m.is_active);
  
  // Stable dependencies for auto-save to prevent loops
  const formDataRef = useRef({
    type: activeTab,
    title,
    body,
    audience,
    selectedClassIds: selectedClassIds.join(','), // Stringify arrays
    eventStartDate,
    eventStartTime,
    eventEndDate,
    eventEndTime,
    eventLocation,
    dueDate,
    dueTime,
    isFromDayFocus,
    dayFocusDate
  });

  // Update ref when data changes
  useEffect(() => {
    formDataRef.current = {
      type: activeTab,
      title,
      body,
      audience,
      selectedClassIds: selectedClassIds.join(','),
      eventStartDate,
      eventStartTime,
      eventEndDate,
      eventEndTime,
      eventLocation,
      dueDate,
      dueTime,
      isFromDayFocus,
      dayFocusDate
    };
  });

  // Auto-save with debouncing to prevent render loops
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only save if there's meaningful content
      if (title.trim() || body.trim() || eventLocation.trim()) {
        const currentData = {
          type: activeTab,
          title,
          body,
          audience,
          selectedClassIds,
          eventStartDate,
          eventStartTime,
          eventEndDate,
          eventEndTime,
          eventLocation,
          dueDate,
          dueTime,
          isFromDayFocus,
          dayFocusDate
        };
        saveDraft(currentData);
      }
    }, 2000); // Increased debounce time

    return () => clearTimeout(timer);
  }, [activeTab, title, body, audience, selectedClassIds.length, eventStartDate, eventStartTime, 
      eventEndDate, eventEndTime, eventLocation, dueDate, dueTime]); // Removed saveDraft from deps

  // Check for holidays in initial data (for editing mode)
  useEffect(() => {
    if (initialData && user && (user.role === 'secretaria' || user.role === 'professor')) {
      let dateToCheck = '';
      
      // Check relevant date based on post type
      if (initialData.type === 'EVENTO' && initialData.eventStartAt) {
        const { dateStr } = splitDateTime(new Date(initialData.eventStartAt));
        dateToCheck = dateStr;
      } else if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(initialData.type) && initialData.dueAt) {
        const { dateStr } = splitDateTime(new Date(initialData.dueAt));
        dateToCheck = dateStr;
      }
      
      if (dateToCheck) {
        // Check if it's a holiday but don't block, just show warning
        checkDateForHoliday(dateToCheck, () => {
          // No action needed - this is just an informational warning for editing
        });
      }
    }
  }, [initialData, user, checkDateForHoliday]);

  // Aviso de feriado ao alterar datas durante edição/criação
  useEffect(() => {
    if (!user) return;
    const roleOk = user.role === 'secretaria' || user.role === 'professor';
    if (!roleOk) return;

    let dateToCheck = '';
    if (activeTab === 'EVENTO' && eventStartDate) {
      dateToCheck = eventStartDate;
    } else if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(activeTab) && dueDate) {
      dateToCheck = dueDate;
    }

    if (dateToCheck) {
      // Apenas exibe o aviso; não bloqueia edição
      checkDateForHoliday(dateToCheck, () => {});
    }
  }, [activeTab, eventStartDate, dueDate, user, checkDateForHoliday]);

  // Apply preferences on mount
  useEffect(() => {
    if (!initialData && preferences && user) {
      let appliedPreferences: any = {
        lastPostType: activeTab,
        lastClassId: selectedClassIds[0] || 'ALL_CLASSES',
        defaultEventDuration: 60,
        source: isFromDayFocus ? 'dayFocus' : 'preferences'
      };

      // Apply default event duration if creating new event
      if (activeTab === 'EVENTO' && !eventEndTime && /^\d{2}:\d{2}$/.test(eventStartTime)) {
        const [h, m] = eventStartTime.split(':');
        const startHour = parseInt(h, 10);
        const startMinute = parseInt(m, 10);
        if (!isNaN(startHour) && !isNaN(startMinute)) {
          const endHour = (startHour + 1) % 24; // 60 minutes default
          const endMinute = startMinute;
          setEventEndTime(`${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`);
          
          if (user) {
            AuditService.trackDefaultDurationApplied(user.id, {
              duration: 60,
              eventType: 'EVENTO'
            });
          }
        }
      }

      if (user) {
        AuditService.trackPrefsApplied(user.id, {
          postType: activeTab,
          classId: selectedClassIds[0] || 'ALL_CLASSES',
          source: isFromDayFocus ? 'dayFocus' : 'preferences'
        });
      }
    }
  }, [preferences, initialData, user, activeTab, selectedClassIds, isFromDayFocus, eventStartTime, eventEndTime]);

  // Real-time holiday detection
  useEffect(() => {
    const checkHolidays = () => {
      const holidays: typeof currentHolidays = {};
      
      // Check event start date
      if (eventStartDate) {
        const [day, month, year] = eventStartDate.split('/').map(Number);
        if (day && month && year) {
          const date = new Date(year, month - 1, day);
          holidays.eventStart = isHoliday(date);
        }
      }
      
      // Check event end date (only if different from start)
      if (eventEndDate && eventEndDate !== eventStartDate) {
        const [day, month, year] = eventEndDate.split('/').map(Number);
        if (day && month && year) {
          const date = new Date(year, month - 1, day);
          holidays.eventEnd = isHoliday(date);
        }
      }
      
      // Check due date
      if (dueDate) {
        const [day, month, year] = dueDate.split('/').map(Number);
        if (day && month && year) {
          const date = new Date(year, month - 1, day);
          holidays.due = isHoliday(date);
        }
      }
      
      setCurrentHolidays(holidays);
    };
    
    checkHolidays();
  }, [eventStartDate, eventEndDate, dueDate]);

  // Applied preferences indicator data
  const appliedPrefs = {
    lastPostType: activeTab,
    lastClassId: selectedClassIds[0] || 'ALL_CLASSES',
    defaultEventDuration: 60,
    source: (isFromDayFocus ? 'dayFocus' : 'preferences') as 'dayFocus' | 'preferences' | 'manual'
  };


  const validateForm = (): boolean => {
    let errors: Record<string, string> = {};

    // Validate title
    const titleValidation = validateTitle(title);
    if (titleValidation) {
      setTitleError(titleValidation);
      toast({
        title: "Erro no título",
        description: titleValidation,
        variant: "destructive",
      });
      return false;
    }

    // Validate body
    const bodyValidation = validateDescription(body);
    if (bodyValidation) {
      setBodyError(bodyValidation);
      toast({
        title: "Erro na descrição",
        description: bodyValidation,
        variant: "destructive",
      });
      return false;
    }

    if (audience === 'CLASS' && selectedClassIds.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos uma turma para posts direcionados",
        variant: "destructive",
      });
      return false;
    }

    // Event validation
    if (activeTab === 'EVENTO') {
      if (!eventStartDate || !eventStartTime || !eventEndDate || !eventEndTime || !eventLocation.trim()) {
        errors.event = "Para eventos, data, hora de início/fim e local são obrigatórios";
        toast({
          title: "Erro",
          description: errors.event,
          variant: "destructive",
        });
        setDateTimeErrors(errors);
        return false;
      }

      const eventStart = combineDateTime(eventStartDate, eventStartTime);
      const eventEnd = combineDateTime(eventEndDate, eventEndTime);

      if (!eventStart || !eventEnd) {
        errors.event = "Datas ou horários inválidos";
        toast({
          title: "Erro",
          description: errors.event,
          variant: "destructive",
        });
        setDateTimeErrors(errors);
        return false;
      }

      if (isPastWithTolerance(eventStartDate, eventStartTime, 15)) {
        errors.eventStart = "Evento deve começar no máximo 15 minutos no passado";
        toast({
          title: "Erro",
          description: errors.eventStart,
          variant: "destructive",
        });
        setDateTimeErrors(errors);
        return false;
      }

      if (eventEnd <= eventStart) {
        errors.eventEnd = "Fim deve ser depois do início";
        toast({
          title: "Erro",
          description: errors.eventEnd,
          variant: "destructive",
        });
        setDateTimeErrors(errors);
        return false;
      }
    }

    // Activity validation
    if (activeTab === 'ATIVIDADE') {
      if (!dueDate || !dueTime) {
        errors.due = "Data e hora de entrega são obrigatórias para atividades";
        toast({
          title: "Erro",
          description: errors.due,
          variant: "destructive",
        });
        setDateTimeErrors(errors);
        return false;
      }

      const dueDateTime = combineDateTime(dueDate, dueTime);
      if (!dueDateTime) {
        errors.due = "Data ou horário de entrega inválidos";
        toast({
          title: "Erro",
          description: errors.due,
          variant: "destructive",
        });
        setDateTimeErrors(errors);
        return false;
      }

      if (!allowPastDeadline && !isFutureByMargin(dueDate, dueTime, 30)) {
        errors.due = "Data de entrega deve ser pelo menos 30 minutos no futuro";
        toast({
          title: "Erro",
          description: errors.due,
          variant: "destructive",
        });
        setDateTimeErrors(errors);
        return false;
      }
    }

    setDateTimeErrors({});
    return true;
  };

  const handleSubmit = (scheduled = false) => {
    if (!validateForm()) return;

    // Check for holiday warning before proceeding (only for secretaria and professor)
    if (user && (user.role === 'secretaria' || user.role === 'professor')) {
      let dateToCheck = '';
      
      // Check the relevant date based on post type
      if (activeTab === 'EVENTO' && eventStartDate) {
        dateToCheck = eventStartDate;
      } else if (activeTab === 'ATIVIDADE' && dueDate) {
        dateToCheck = dueDate;
      }
      
      if (dateToCheck) {
        const shouldProceed = checkDateForHoliday(dateToCheck, () => {
          proceedWithSubmission(scheduled);
        });
        
        if (!shouldProceed) {
          return; // Wait for user confirmation
        }
      }
    }

    proceedWithSubmission(scheduled);
  };

  const proceedWithSubmission = (scheduled = false) => {

    let finalPublishDateTime: Date | null = null;
    let showTooltip = false;

    if (scheduled) {
      if (!publishDate || !publishTime) {
        toast({
          title: "Erro",
          description: "Data e hora de publicação são obrigatórias para agendar",
          variant: "destructive"
        });
        return;
      }
      
      finalPublishDateTime = combineDateTime(publishDate, publishTime);
      if (!finalPublishDateTime) {
        toast({
          title: "Erro",
          description: "Data ou hora de publicação inválida",
          variant: "destructive"
        });
        return;
      }
      
      const now = new Date();
      
      if (finalPublishDateTime <= now) {
        // Adjust to now and show tooltip
        finalPublishDateTime = now;
        showTooltip = true;
        setShowPublishNowTooltip(true);
        setTimeout(() => setShowPublishNowTooltip(false), 3000);
      }
    }

    // Convert attachments to PostAttachment format
    const postAttachments: PostAttachment[] = attachments.map(att => ({
      name: att.name,
      url: att.dataUrl || '#mock-url',
      size: att.size
    }));

    const postData: PostInput = {
      type: activeTab,
      title: clampLen(title, 120),
      body: body.trim() ? clampLen(body, 1000) : undefined,
      audience,
      classIds: audience === 'CLASS' ? selectedClassIds : undefined,
      attachments: postAttachments.length > 0 ? postAttachments : undefined,
      status: (scheduled && !showTooltip) ? 'SCHEDULED' : 'PUBLISHED',
      publishAt: (scheduled && !showTooltip) ? finalPublishDateTime?.toISOString() : undefined,
      meta: { 
        important: isImportant,
        contactPhone: contactPhone.trim() || undefined
      }
    };

    if (activeTab === 'EVENTO') {
      const eventStart = combineDateTime(eventStartDate, eventStartTime);
      const eventEnd = combineDateTime(eventEndDate, eventEndTime);
      postData.eventStartAt = eventStart?.toISOString();
      postData.eventEndAt = eventEnd?.toISOString();
      postData.eventLocation = eventLocation.trim();
      postData.allowInvitations = allowInvitations;
    }

    if (activeTab === 'ATIVIDADE') {
      const dueDateTime = combineDateTime(dueDate, dueTime);
      postData.dueAt = dueDateTime?.toISOString();
    }

    onSubmit(postData);
    
    // Save preferences for next time
    if (user && preferences) {
      saveLastChoices(
        activeTab,
        selectedClassIds[0] || 'ALL_CLASSES',
        {
          savedFilter: true,
          level: levelFilter,
          modality: modalityFilter
        }
      );
    }
    
    // Delete draft after successful submission
    deleteDraft();
    
    // Reset form
    setTitle('');
    setBody('');
    setAudience(user?.role === 'professor' ? 'CLASS' : 'GLOBAL');
    setSelectedClassIds([]);
    setClassSearch('');
    setLevelFilter('ALL_LEVELS');
    setModalityFilter('ALL_MODALITIES');
    setEventStartDate('');
    setEventStartTime('');
    setEventEndDate('');
    setEventEndTime('');
    setEventLocation('');
    setAttachments([]);
    setPublishDate('');
    setPublishTime('');
    setDueDate('');
    setDueTime('');
    setAllowPastDeadline(false);
    setContactPhone('');
    setTitleError(null);
    setBodyError(null);
    setDateTimeErrors({});
    setIsImportant(false);
    setAllowInvitations(false);

    if (scheduled && !showTooltip) {
      toast({
        title: "Sucesso",
        description: `Post agendado para ${formatDateTime(finalPublishDateTime!)}`,
      });
    } else if (showTooltip) {
      toast({
        title: "Publicado imediatamente",
        description: "A data estava no passado, então foi publicado agora",
      });
    } else {
      toast({
        title: "Sucesso",
        description: `${activeTab.toLowerCase()} publicado com sucesso!`,
      });
    }
  };

  const handleClassToggle = (classId: string) => {
    setSelectedClassIds(prev => 
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const removeSelectedClass = (classId: string) => {
    setSelectedClassIds(prev => prev.filter(id => id !== classId));
  };

  const getTabIcon = (type: PostType) => {
    switch (type) {
      case 'AVISO': return '📢';
      case 'COMUNICADO': return '📋';
      case 'EVENTO': return '📅';
      case 'ATIVIDADE': return '📝';
      default: return '📄';
    }
  };

  const getTabLabel = (type: PostType) => {
    switch (type) {
      case 'AVISO': return 'Aviso';
      case 'COMUNICADO': return 'Comunicado';
      case 'EVENTO': return 'Evento';
      case 'ATIVIDADE': return 'Atividade';
      default: return type;
    }
  };

return (
    <TooltipProvider>
      <Card className="glass-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              {initialData ? 'Editar Post' : 'Criar Novo Post'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowTemplateManager(true)}
                className="text-xs"
              >
                <Save className="h-4 w-4 mr-1" />
                Templates
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowDraftManager(true)}
                className="text-xs"
              >
                Rascunhos
              </Button>
            </div>
          </div>
          
          {/* Preferences indicator */}
          <PreferencesIndicator 
            appliedPrefs={appliedPrefs}
            className="mt-2"
          />
        </CardHeader>
        <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PostType)}>
          <TabsList className="grid grid-cols-3 w-full bg-background/50">
            {allowedTypes.map((type) => (
              <TabsTrigger
                key={type}
                value={type}
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                <span className="mr-2">{getTabIcon(type)}</span>
                {getTabLabel(type)}
              </TabsTrigger>
            ))}
          </TabsList>

          {allowedTypes.map((type) => (
            <TabsContent key={type} value={type} className="space-y-4 mt-6">
              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="title">Título * (máx. 120 caracteres)</Label>
                <Input
                  id="title"
                  placeholder={`Digite o título do ${getTabLabel(type).toLowerCase()}`}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (titleError) setTitleError(null);
                  }}
                  className={cn(
                    "bg-background/50 border-border/50",
                    titleError && "border-destructive"
                  )}
                  maxLength={120}
                />
                {titleError && (
                  <p className="text-sm text-destructive">{titleError}</p>
                )}
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="body">Descrição (máx. 1.000 caracteres)</Label>
                <TextareaWithCounter
                  value={body}
                  onChange={setBody}
                  maxLength={1000}
                  placeholder="Digite a descrição detalhada..."
                  className="bg-background/50 border-border/50 min-h-[100px]"
                  error={bodyError}
                />
              </div>

              {/* Campos específicos para EVENTO */}
              {type === 'EVENTO' && (
                <div className="space-y-4 p-4 rounded-lg bg-accent/10 border border-accent/20">
                  <h4 className="font-medium text-accent-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Detalhes do Evento
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data de Início *</Label>
                      <InputDate
                        value={eventStartDate}
                        onChange={setEventStartDate}
                        className="bg-background/50 border-border/50"
                        error={!!dateTimeErrors.eventStart}
                      />
                      {currentHolidays.eventStart && (
                        <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                          Feriado {currentHolidays.eventStart.type === 'national' ? 'Nacional' : 
                                   currentHolidays.eventStart.type === 'civic' ? 'Cívico' : 'Religioso'}: {currentHolidays.eventStart.name}
                        </Badge>
                      )}
                      {dateTimeErrors.eventStart && (
                        <p className="text-sm text-destructive">{dateTimeErrors.eventStart}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Hora de Início *</Label>
                      <InputTime
                        value={eventStartTime}
                        onChange={setEventStartTime}
                        className="bg-background/50 border-border/50"
                        error={!!dateTimeErrors.eventStart}
                        step={15}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data de Fim *</Label>
                      <InputDate
                        value={eventEndDate}
                        onChange={setEventEndDate}
                        className="bg-background/50 border-border/50"
                        error={!!dateTimeErrors.eventEnd}
                      />
                      {currentHolidays.eventEnd && (
                        <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                          Feriado {currentHolidays.eventEnd.type === 'national' ? 'Nacional' : 
                                   currentHolidays.eventEnd.type === 'civic' ? 'Cívico' : 'Religioso'}: {currentHolidays.eventEnd.name}
                        </Badge>
                      )}
                      {dateTimeErrors.eventEnd && (
                        <p className="text-sm text-destructive">{dateTimeErrors.eventEnd}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Hora de Fim *</Label>
                      <InputTime
                        value={eventEndTime}
                        onChange={setEventEndTime}
                        className="bg-background/50 border-border/50"
                        error={!!dateTimeErrors.eventEnd}
                        step={15}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="eventLocation">Local *</Label>
                    <Input
                      id="eventLocation"
                      placeholder="Ex: Auditório Principal, Sala 101..."
                      value={eventLocation}
                      onChange={(e) => setEventLocation(e.target.value)}
                      className="bg-background/50 border-border/50"
                      maxLength={200}
                    />
                  </div>
                  
                  {/* Allow Invitations Checkbox */}
                  <div className="space-y-2 p-4 bg-purple-500/5 rounded-lg border border-purple-500/20">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allow-invitations"
                        checked={allowInvitations}
                        onCheckedChange={(checked) => setAllowInvitations(checked as boolean)}
                      />
                      <Label
                        htmlFor="allow-invitations"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Permitir convidar amigos?
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      Quando ativado, os alunos poderão convidar amigos para este evento através de um formulário.
                    </p>
                  </div>
                </div>
              )}

              {/* Campos específicos para ATIVIDADE */}
              {type === 'ATIVIDADE' && (
                <div className="space-y-4 p-4 rounded-lg bg-accent/10 border border-accent/20">
                  <h4 className="font-medium text-accent-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Detalhes da Atividade
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data do Prazo *</Label>
                      <InputDate
                        value={dueDate}
                        onChange={setDueDate}
                        className="bg-background/50 border-border/50"
                        error={!!dateTimeErrors.due}
                      />
                      {currentHolidays.due && (
                        <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                          Feriado {currentHolidays.due.type === 'national' ? 'Nacional' : 
                                   currentHolidays.due.type === 'civic' ? 'Cívico' : 'Religioso'}: {currentHolidays.due.name}
                        </Badge>
                      )}
                      {dateTimeErrors.due && (
                        <p className="text-sm text-destructive">{dateTimeErrors.due}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Hora do Prazo *</Label>
                      <InputTime
                        value={dueTime}
                        onChange={setDueTime}
                        className="bg-background/50 border-border/50"
                        error={!!dateTimeErrors.due}
                        step={15}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allowPastDeadline"
                      checked={allowPastDeadline}
                      onCheckedChange={(checked) => setAllowPastDeadline(checked === true)}
                    />
                    <Label htmlFor="allowPastDeadline" className="text-sm">
                      Permitir prazo no passado
                    </Label>
                  </div>
                </div>
              )}

              {/* Audiência */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Audiência</Label>
                  <Select 
                    value={audience} 
                    onValueChange={(value: 'GLOBAL' | 'CLASS') => {
                      setAudience(value);
                      if (value === 'GLOBAL') {
                        setSelectedClassIds([]);
                      }
                    }}
                    disabled={user?.role === 'professor'} // Professor só pode usar CLASS
                  >
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-border/50">
                      {user?.role === 'secretaria' && (
                        <SelectItem value="GLOBAL">Global (Toda a escola)</SelectItem>
                      )}
                      <SelectItem value="CLASS">Turmas específicas</SelectItem>
                    </SelectContent>
                  </Select>
                  {user?.role === 'professor' && (
                    <p className="text-xs text-muted-foreground">
                      Professores podem publicar apenas para suas turmas
                    </p>
                  )}
                </div>

                {/* Multi-select de turmas quando audience = CLASS */}
                {audience === 'CLASS' && (
                  <div className="space-y-3">
                    <Label>Selecionar Turmas</Label>
                    
                    {/* Selected classes display */}
                    {selectedClassIds.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {selectedClassIds.map(classId => {
                            const cls = availableClasses.find(c => c.id === classId);
                            if (!cls) return null;
                            
                            const displayInfo = getClassDisplayInfo(cls, levels, modalities);
                            const subjectNames = resolveSubjectNames(cls.subjectIds, subjects);
                            const subjectCount = subjectNames.length;
                            
                            return (
                              <Badge key={classId} variant="secondary" className="flex items-center gap-1 max-w-full">
                                <div className="flex flex-col items-start text-xs min-w-0">
                                  <div className="font-medium truncate">
                                    {cls.name} — {displayInfo.levelModality}
                                  </div>
                                  <div className="text-muted-foreground truncate">
                                    {displayInfo.schedule}
                                    {subjectCount > 0 && ` (+${subjectCount} matérias)`}
                                  </div>
                                </div>
                                <X 
                                  className="h-3 w-3 cursor-pointer hover:text-destructive shrink-0 ml-1" 
                                  onClick={() => removeSelectedClass(classId)}
                                />
                              </Badge>
                            );
                          })}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {selectedClassIds.length} selecionada{selectedClassIds.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    )}
                    
                    {/* Filters */}
                    <div className="space-y-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
                      <div className="flex items-center gap-2 text-sm font-medium text-accent-foreground">
                        <Filter className="h-4 w-4" />
                        Filtros
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Search */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar turmas..."
                            value={classSearch}
                            onChange={(e) => setClassSearch(e.target.value)}
                            className="pl-10 bg-background/50 border-border/50"
                          />
                        </div>
                        
                        {/* Level Filter */}
                        <Select value={levelFilter} onValueChange={setLevelFilter}>
                          <SelectTrigger className="bg-background/50 border-border/50">
                            <SelectValue placeholder="Todos os níveis" />
                          </SelectTrigger>
                          <SelectContent className="glass-card border-border/50">
                            <SelectItem value="ALL_LEVELS">Todos os níveis</SelectItem>
                            {availableLevels.map(level => (
                              <SelectItem key={level.id} value={level.id}>
                                {level.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {/* Modality Filter */}
                        <Select value={modalityFilter} onValueChange={setModalityFilter}>
                          <SelectTrigger className="bg-background/50 border-border/50">
                            <SelectValue placeholder="Todas as modalidades" />
                          </SelectTrigger>
                          <SelectContent className="glass-card border-border/50">
                            <SelectItem value="ALL_MODALITIES">Todas as modalidades</SelectItem>
                            {availableModalities.map(modality => (
                              <SelectItem key={modality.id} value={modality.id}>
                                {modality.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Classes list with checkboxes */}
                    <div className="max-h-48 overflow-y-auto space-y-2 border border-border/30 rounded-lg p-3 bg-background/30">
                      {filteredClasses.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {availableClasses.length === 0 
                            ? 'Nenhuma turma disponível' 
                            : 'Nenhuma turma encontrada'
                          }
                        </p>
                      ) : (
                        filteredClasses.map(cls => {
                          const displayInfo = getClassDisplayInfo(cls, levels, modalities);
                          const subjectNames = resolveSubjectNames(cls.subjectIds, subjects);
                          
                          return (
                            <div 
                              key={cls.id}
                              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/20 cursor-pointer border border-transparent hover:border-border/50"
                              onClick={() => handleClassToggle(cls.id)}
                            >
                              <Checkbox
                                checked={selectedClassIds.includes(cls.id)}
                                onChange={() => handleClassToggle(cls.id)}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{displayInfo.fullInfo}</div>
                                {cls.code && (
                                  <div className="text-xs text-muted-foreground mt-0.5">Código: {cls.code}</div>
                                )}
                                {subjectNames.length > 0 && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    Matérias: {subjectNames.slice(0, 3).join(', ')}
                                    {subjectNames.length > 3 && ` (+${subjectNames.length - 3} mais)`}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground shrink-0">
                                {cls.students.length} alunos
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Telefone de contato (opcional) */}
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Telefone de contato</Label>
                <InputPhone
                  value={contactPhone}
                  onChange={setContactPhone}
                  placeholder="(11) 99999-9999"
                  className="bg-background/50 border-border/50"
                  showError={false}
                />
              </div>

              {/* Anexos */}
              <AttachmentUploader 
                value={attachments}
                onChange={setAttachments}
              />

              {/* Toggle Importante - Melhorado para Avisos e Comunicados */}
              {(type === 'AVISO' || type === 'COMUNICADO' || type === 'EVENTO') && (
                <div className={cn(
                  "space-y-3 p-5 rounded-lg border transition-all duration-200",
                  isImportant 
                    ? "bg-amber-50/50 border-amber-300/60 shadow-sm" 
                    : "bg-accent/5 border-border/40 hover:bg-accent/10"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="isImportant"
                        checked={isImportant}
                        onCheckedChange={(checked) => setIsImportant(checked === true)}
                        className={cn(
                          "h-5 w-5 transition-colors",
                          "border-border data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500",
                          isImportant && "shadow-sm"
                        )}
                      />
                      <div className="flex items-center gap-2">
                        <Star className={cn(
                          "h-5 w-5 transition-colors", 
                          isImportant ? "text-amber-500 fill-amber-100" : "text-muted-foreground"
                        )} />
                        <Label 
                          htmlFor="isImportant" 
                          className={cn(
                            "text-sm font-medium cursor-pointer transition-colors",
                            isImportant ? "text-amber-700" : "text-foreground"
                          )}
                        >
                          Marcar como Importante
                        </Label>
                      </div>
                    </div>
                    {isImportant && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-300/40">
                        <Star className="h-3 w-3 text-amber-600 fill-amber-200" />
                        <span className="text-xs font-medium text-amber-700">Prioridade Alta</span>
                      </div>
                    )}
                  </div>
                  <div className="pl-8">
                    <p className={cn(
                      "text-xs transition-colors",
                      isImportant ? "text-amber-600/80" : "text-muted-foreground"
                    )}>
                      {type === 'AVISO' && 'Avisos importantes aparecem destacados no feed e nas notificações'}
                      {type === 'COMUNICADO' && 'Comunicados importantes recebem prioridade nas notificações dos usuários'}
                      {type === 'EVENTO' && 'Eventos importantes aparecem na aba "Importantes" das notificações'}
                    </p>
                    {isImportant && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-amber-600/90">
                        <div className="w-1 h-1 rounded-full bg-amber-500"></div>
                        <span>Este {type.toLowerCase()} será destacado para todos os usuários</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Scheduling Section */}
        <SchedulingSection
          publishDate={publishDate}
          publishTime={publishTime}
          onPublishDateChange={setPublishDate}
          onPublishTimeChange={setPublishTime}
          onSchedule={() => handleSubmit(true)}
          onClearSchedule={() => {
            setPublishDate('');
            setPublishTime('');
          }}
          isLoading={isLoading}
          className="mt-6"
        />

        {/* Actions */}
        <ComposerActions
          onCancel={onCancel}
          onSaveDraft={() => {
            const currentData = {
              type: activeTab,
              title,
              body,
              audience,
              selectedClassIds,
              eventStartDate,
              eventStartTime,
              eventEndDate,
              eventEndTime,
              eventLocation,
              dueDate,
              dueTime,
              isFromDayFocus,
              dayFocusDate
            };
            saveDraft(currentData);
          }}
          onSchedule={() => handleSubmit(true)}
          onPublish={() => handleSubmit()}
          canSchedule={!!(publishDate && publishTime)}
          canPublish={!!title.trim()}
          isLoading={isLoading}
          isEditing={!!initialData?.originalId}
        />
      </CardContent>
      </Card>
      
      {/* Template Manager */}
      {showTemplateManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Gerenciar Templates</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowTemplateManager(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <TemplateManager
              postType={activeTab}
              currentData={{
                title,
                body,
                eventLocation
              }}
              onApplyTemplate={(template) => {
                setActiveTab(template.type);
                setTitle(template.title);
                setBody(template.body || '');
                if (template.eventLocation) {
                  setEventLocation(template.eventLocation);
                }
                
                toast({
                  title: "Template aplicado",
                  description: `Template "${template.name}" foi aplicado com sucesso.`,
                });
                
                if (user) {
                  AuditService.trackTemplateApplied(user.id, {
                    templateId: template.id,
                    templateName: template.name
                  });
                }
                
                setShowTemplateManager(false);
              }}
            />
          </div>
        </div>
      )}
      
      {/* Draft Manager */}
      {showDraftManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Gerenciar Rascunhos</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowDraftManager(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <DraftManager
              drafts={getAllDrafts()}
              hasUnsavedChanges={hasUnsavedChanges({
                type: activeTab,
                title,
                body,
                audience,
                selectedClassIds,
                eventStartDate,
                eventStartTime,
                eventEndDate,
                eventEndTime,
                eventLocation,
                dueDate,
                dueTime,
                isFromDayFocus,
                dayFocusDate
              })}
              onLoadDraft={(draft) => {
                setActiveTab(draft.type);
                setTitle(draft.title);
                setBody(draft.body || '');
                setAudience(draft.audience);
                setSelectedClassIds(draft.selectedClassIds || []);
                setEventStartDate(draft.eventStartDate || '');
                setEventStartTime(draft.eventStartTime || '');
                setEventEndDate(draft.eventEndDate || '');
                setEventEndTime(draft.eventEndTime || '');
                setEventLocation(draft.eventLocation || '');
                setDueDate(draft.dueDate || '');
                setDueTime(draft.dueTime || '');
                
                toast({
                  title: "Rascunho carregado",
                  description: "Rascunho foi aplicado com sucesso.",
                });
                
                setShowDraftManager(false);
              }}
              onDeleteDraft={(draftId) => {
                // The DraftManager handles deletion internally
                toast({
                  title: "Rascunho removido",
                  description: "O rascunho foi removido com sucesso.",
                });
              }}
              onSaveCurrentDraft={() => {
                const currentData = {
                  type: activeTab,
                  title,
                  body,
                  audience,
                  selectedClassIds,
                  eventStartDate,
                  eventStartTime,
                  eventEndDate,
                  eventEndTime,
                  eventLocation,
                  dueDate,
                  dueTime,
                  isFromDayFocus,
                  dayFocusDate
                };
                saveDraft(currentData);
                toast({
                  title: "Rascunho salvo",
                  description: "Suas alterações foram salvas.",
                });
              }}
            />
          </div>
        </div>
      )}

      {/* Holiday Warning Dialog */}
      <HolidayWarningDialog
        open={warningState.isOpen}
        holiday={warningState.holiday}
        onConfirm={confirmHoliday}
        onCancel={cancelHoliday}
      />
    </TooltipProvider>
  );
}