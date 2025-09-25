import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ClassCalendarEvent } from '@/hooks/useClassCalendarData';
import { FileText, FolderOpen, ClipboardCheck, AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClassCalendarEventChipProps {
  event: ClassCalendarEvent;
  onClick: () => void;
  compact?: boolean;
  isDraggable?: boolean;
}

const TYPE_CONFIG = {
  ATIVIDADE: {
    label: 'Atividade',
    icon: FileText,
    color: '#3B82F6',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-l-blue-500',
    textColor: 'text-blue-400'
  },
  TRABALHO: {
    label: 'Trabalho',
    icon: FolderOpen,
    color: '#F59E0B',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-l-orange-500',
    textColor: 'text-orange-400'
  },
  PROVA: {
    label: 'Prova',
    icon: ClipboardCheck,
    color: '#EF4444',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-l-red-500',
    textColor: 'text-red-400'
  }
} as const;

export function ClassCalendarEventChip({ event, onClick, compact = false, isDraggable = false }: ClassCalendarEventChipProps) {
  const config = TYPE_CONFIG[event.type];
  const Icon = config.icon;

  const formatDueTime = () => {
    return format(event.dueDate, 'HH:mm', { locale: ptBR });
  };

  const formatDueDateTime = () => {
    return format(event.dueDate, "d 'de' MMM 'às' HH:mm", { locale: ptBR });
  };

  const chipClasses = cn(
    'w-full text-left p-2 rounded-md border-l-2 transition-all duration-200',
    'hover:shadow-md hover:scale-[1.02] cursor-pointer',
    config.bgColor,
    config.borderColor,
    event.isScheduled && 'opacity-60 border-dashed',
    compact ? 'text-xs' : 'text-sm',
    isDraggable && 'cursor-grab active:cursor-grabbing hover:scale-105'
  );

  const chip = (
    <Button
      variant="ghost"
      className={chipClasses}
      onClick={(e) => {
        e.stopPropagation(); // Prevent triggering cell click
        onClick();
      }}
      size="sm"
      draggable={isDraggable}
      onDragStart={(e) => {
        if (isDraggable) {
          e.dataTransfer.setData('text/plain', event.post.id);
          e.dataTransfer.effectAllowed = 'move';
          console.log('Starting class calendar drag with ID:', event.post.id);
        }
      }}
    >
      <div className="flex items-start gap-2 w-full">
        <Icon className={cn('h-3 w-3 shrink-0 mt-0.5', config.textColor)} />
        
        <div className="flex-1 min-w-0">
          <div className={cn('font-medium truncate', config.textColor)}>
            {event.title}
          </div>
          {!compact && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {formatDueTime()}
              </span>
              {event.isOverdue && (
                <Badge variant="destructive" className="h-4 px-1.5 text-xs bg-pink-600/20 text-pink-400 border-pink-600/30">
                  <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                  Atrasada
                </Badge>
              )}
              {event.isScheduled && (
                <Badge variant="outline" className="h-4 px-1.5 text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  <Clock className="h-2.5 w-2.5 mr-1" />
                  Agendada
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </Button>
  );

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {chip}
        </TooltipTrigger>
        <TooltipContent side="right" className="glass-card border-border/50 max-w-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className={cn('h-4 w-4', config.textColor)} />
              <Badge variant="outline" className={cn(config.bgColor, config.textColor, 'border-current/30')}>
                {config.label}
              </Badge>
            </div>
            
            <h4 className="font-semibold text-sm">{event.title}</h4>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Prazo: {formatDueDateTime()}</div>
              
              {event.isOverdue && (
                <div className="flex items-center gap-1 text-pink-400">
                  <AlertTriangle className="h-3 w-3" />
                  Atividade atrasada
                </div>
              )}
              
              {event.isScheduled && (
                <div className="flex items-center gap-1 text-yellow-400">
                  <Clock className="h-3 w-3" />
                  Publicação agendada
                </div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return chip;
}