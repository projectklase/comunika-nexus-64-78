import { Badge } from '@/components/ui/badge';
import { CalendarEvent } from '@/hooks/useCalendarData';
import { NormalizedCalendarEvent } from '@/utils/calendar-events';
import { Clock, AlertCircle, Calendar as CalendarIcon, FileText, FolderOpen, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useClassStore } from '@/stores/class-store';
import { getClassDisplayInfo, resolveSubjectNames } from '@/utils/class-helpers';
import { useWeightsEnabled } from '@/hooks/useWeightsEnabled';
import { openActivityDrawerFromCalendar, activityDrawerStore, dayDrawerStore } from '@/utils/activity-drawer-handler';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePostViews } from '@/stores/post-views.store';
import { useLevels } from '@/hooks/useLevels';
import { useModalities } from '@/hooks/useModalities';
import { useSubjects } from '@/hooks/useSubjects';

interface EventChipProps {
  event: CalendarEvent | NormalizedCalendarEvent;
  onClick?: () => void;
  isDraggable?: boolean;
  className?: string;
  useUnifiedHandler?: boolean;
}

const typeStyles = {
  AVISO: 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30',
  COMUNICADO: 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30',
  EVENTO: 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30 neon-glow',
  ATIVIDADE: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30',
  TRABALHO: 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30',
  PROVA: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'
};

const typeIcons = {
  AVISO: AlertCircle,
  COMUNICADO: AlertCircle,
  EVENTO: CalendarIcon,
  ATIVIDADE: FileText,
  TRABALHO: FolderOpen,
  PROVA: ClipboardCheck
};

export function EventChip({ event, onClick, isDraggable = false, className, useUnifiedHandler = false }: EventChipProps) {
  const navigate = useNavigate();
  const { getClass } = useClassStore();
  const weightsEnabled = useWeightsEnabled();
  const { user } = useAuth();
  const { recordPostView } = usePostViews();
  const { levels } = useLevels();
  const { modalities } = useModalities();
  const { subjects } = useSubjects();
  
  // VALIDAÇÃO DEFENSIVA COMPLETA - Previne erros de null/undefined
  if (!event) {
    console.warn('[EventChip] Event is null or undefined');
    return null;
  }

  // Para NormalizedCalendarEvent, valida meta
  if ('meta' in event) {
    if (!event.meta || !event.meta.title || !event.subtype) {
      console.warn('[EventChip] NormalizedCalendarEvent com meta incompleto:', event);
      return null;
    }
  }

  // Para CalendarEvent, valida post
  if ('post' in event) {
    if (!event.post || !event.post.title || !event.post.type) {
      console.warn('[EventChip] CalendarEvent com post incompleto:', event);
      return null;
    }
  }
  
  // Handle both CalendarEvent and NormalizedCalendarEvent COM FALLBACKS
  const post = 'meta' in event ? {
    id: event.postId || 'unknown',
    type: event.subtype || 'AVISO',
    title: event.meta?.title || 'Título não disponível',
    authorName: event.meta?.author || 'Autor desconhecido',
    audience: event.meta?.audience || 'N/A',
    classIds: event.classIds || [],
    classId: event.classId || undefined,
    eventLocation: event.meta?.eventLocation || undefined,
    activityMeta: event.meta?.activityMeta || undefined,
  } : (event.post || {
    id: 'unknown',
    type: 'AVISO',
    title: 'Post não disponível',
    authorName: 'Desconhecido',
    audience: 'N/A',
    classIds: [],
  });
  
  const type = 'meta' in event ? event.type : event.type;
  const startDate = event.startDate || new Date(); // Fallback para data atual
  
  const Icon = typeIcons[post.type as keyof typeof typeIcons] || AlertCircle;
  const chipStyle = typeStyles[post.type as keyof typeof typeStyles] || typeStyles.AVISO;

  // Log detalhado em modo de desenvolvimento para rastreamento
  if (process.env.NODE_ENV === 'development') {
    console.log('[EventChip] Rendering event:', {
      postId: post.id,
      type: post.type,
      title: post.title,
      hasIcon: !!Icon,
      hasStyle: !!chipStyle
    });
  }

  // Safe date formatting with fallback
  const formatSafeTime = (date: Date | null | undefined): string => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '00:00';
    }
    try {
      return format(date, 'HH:mm', { locale: ptBR });
    } catch {
      return '00:00';
    }
  };

  const timeText = type === 'deadline' 
    ? `Prazo: ${formatSafeTime(startDate)}`
    : formatSafeTime(startDate);

  // Get class information for tooltip with safe string conversion
  const getClassInfo = () => {
    if (!post || !post.audience) {
      return 'Audiência: Não especificada';
    }
    
    if (post.audience === 'GLOBAL') {
      return 'Audiência: Global (Toda a escola)';
    }
    
    if (post.classIds && post.classIds.length > 0) {
      const classInfos = post.classIds.map(classId => {
        const cls = getClass(classId);
        if (!cls) return `Turma não encontrada (${String(classId || 'N/A')})`;
        
        const displayInfo = getClassDisplayInfo(cls, levels, modalities);
        const subjectNames = resolveSubjectNames(cls.subjectIds, subjects);
        const subjectText = subjectNames.length > 0 ? ` (+${subjectNames.length} matérias)` : '';
        
        // Ensure all values are strings
        const name = String(cls.name || 'Sem nome');
        const levelModality = String(displayInfo?.levelModality || 'N/A');
        const schedule = String(displayInfo?.schedule || 'N/A');
        
        return `${name} — ${levelModality} — ${schedule}${subjectText}`;
      }).filter(info => typeof info === 'string'); // Only keep valid strings
      
      return post.classIds.length === 1 
        ? `Audiência: ${classInfos[0] || 'Informação indisponível'}`
        : `Audiência: ${post.classIds.length} turmas\n${classInfos.join('\n')}`;
    }
    
    return 'Audiência: Não especificada';
  };

  // Use unified handler for drawer types when enabled
  const isDrawerType = ['ATIVIDADE', 'TRABALHO', 'PROVA', 'EVENTO'].includes(post.type);
  const shouldUseUnifiedHandler = useUnifiedHandler && isDrawerType && 'meta' in event;
  
  const handleClick = shouldUseUnifiedHandler && (event as NormalizedCalendarEvent).clickable
    ? (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        
        const normalizedEvent = event as NormalizedCalendarEvent;
        
        // Record post view
        if (user) {
          recordPostView(normalizedEvent.postId, user, 'calendar', normalizedEvent.classId);
        }
        
        // Close the old day drawer
        dayDrawerStore.close();
        
        // Open the activity drawer directly
        activityDrawerStore.open({
          postId: normalizedEvent.postId,
          classId: normalizedEvent.classId,
          mode: 'calendar',
          type: normalizedEvent.type,
          subtype: normalizedEvent.subtype,
          status: normalizedEvent.status,
        });
      }
    : (e: React.MouseEvent) => {
        if (onClick) {
          // Record post view for regular onClick handlers
          if (user) {
            recordPostView(post.id, user, 'calendar', post.classIds?.[0] || post.classId);
          }
          onClick();
        }
      };

const badge = (
    <Badge
      variant="outline"
        className={cn(
          'flex items-center gap-1 px-2 py-0.5 h-6 cursor-pointer transition-all duration-200',
          'glass-card neon-glow text-xs font-medium min-w-0',
          chipStyle,
          isDraggable && 'cursor-grab active:cursor-grabbing hover:scale-105',
          handleClick && !isDraggable && 'hover:scale-105 hover:neon-glow-strong',
          className
        )}
      onClick={(e) => {
        e.stopPropagation(); // Prevent triggering cell click
        e.preventDefault(); // Prevent default browser behavior
        
        if (handleClick) {
          try {
            if (typeof handleClick === 'function') {
              handleClick(e);
            }
          } catch (error) {
            console.error('Error handling event click:', error);
          }
        }
      }}
      draggable={isDraggable}
      onDragStart={(e) => {
        if (isDraggable) {
          // Use postId for drag data as it's what the store update expects
          const dragId = 'meta' in event ? event.postId : event.post.id;
          e.dataTransfer.setData('text/plain', dragId);
          e.dataTransfer.effectAllowed = 'move';
          console.log('Starting drag with ID:', dragId);
        }
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && handleClick) {
          e.preventDefault();
          e.stopPropagation();
          
          if (typeof handleClick === 'function') {
            handleClick(e as any);
          }
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${post.type}: ${post.title}, às ${timeText}${post.eventLocation ? ` em ${post.eventLocation}` : ''}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate flex-1 min-w-0">{String(post.title || 'Sem título')}</span>
      <span className="text-[10px] opacity-70 shrink-0 ml-1">
        {String(timeText)}
      </span>
    </Badge>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm whitespace-pre-line">
          <div className="space-y-1">
            <div className="font-medium">{String(post.title || 'Sem título')}</div>
            <div className="text-sm text-muted-foreground">
              {getClassInfo()}
            </div>
            {post.eventLocation && typeof post.eventLocation === 'string' && post.eventLocation.trim() && (
              <div className="text-sm text-muted-foreground">
                📍 {String(post.eventLocation).trim()}
              </div>
            )}
            {weightsEnabled && post.activityMeta?.peso !== null && post.activityMeta?.peso !== undefined && post.activityMeta?.usePeso !== false && (
              <div className="text-sm text-muted-foreground">
                ⚖️ Peso: {String(Number(post.activityMeta.peso) || 0)}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}