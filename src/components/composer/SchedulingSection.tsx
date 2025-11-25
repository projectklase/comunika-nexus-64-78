import React from 'react';
import { Button } from '@/components/ui/button';
import { InputDate } from '@/components/ui/input-date';
import { InputTime } from '@/components/ui/input-time';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, Clock, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { combineDateTime, isFutureByMargin } from '@/lib/date-helpers';

interface SchedulingSectionProps {
  publishDate: string;
  publishTime: string;
  onPublishDateChange: (date: string) => void;
  onPublishTimeChange: (time: string) => void;
  onSchedule: () => void;
  onClearSchedule?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function SchedulingSection({
  publishDate,
  publishTime,
  onPublishDateChange,
  onPublishTimeChange,
  onSchedule,
  onClearSchedule,
  isLoading = false,
  className
}: SchedulingSectionProps) {
  // Validation
  const hasValidDateTime = publishDate && publishTime;
  const scheduledDateTime = hasValidDateTime ? combineDateTime(publishDate, publishTime) : null;
  const isValidFutureDate = scheduledDateTime ? isFutureByMargin(publishDate, publishTime, 5) : false;
  const isPastDate = scheduledDateTime && !isValidFutureDate;
  
  // Status badge content
  const getStatusBadge = () => {
    if (!hasValidDateTime) return null;
    
    if (isPastDate) {
      return (
        <Badge variant="destructive" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          Data no passado
        </Badge>
      );
    }
    
    if (scheduledDateTime) {
      const formattedDate = format(scheduledDateTime, "dd/MM 'às' HH:mm", { locale: ptBR });
      return (
        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
          <Calendar className="h-3 w-3 mr-1" />
          Agendado para {formattedDate}
          {onClearSchedule && (
            <button
              onClick={onClearSchedule}
              className="ml-2 hover:text-destructive transition-colors"
              aria-label="Remover agendamento"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      );
    }
    
    return null;
  };

  return (
    <div className={cn("space-y-4 p-4 rounded-lg bg-accent/5 border border-accent/20", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Programar Publicação</Label>
        </div>
        {getStatusBadge()}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Data
          </Label>
          <InputDate
            value={publishDate}
            onChange={onPublishDateChange}
            placeholder="dd/mm/aaaa"
            className={cn(
              "h-9 text-sm bg-background/50 border-border/50 focus-visible:ring-primary/20",
              isPastDate && "border-destructive focus-visible:ring-destructive/20"
            )}
            error={isPastDate}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Hora
          </Label>
          <InputTime
            value={publishTime}
            onChange={onPublishTimeChange}
            placeholder="hh:mm"
            step={15}
            className={cn(
              "h-9 text-sm bg-background/50 border-border/50 focus-visible:ring-primary/20",
              isPastDate && "border-destructive focus-visible:ring-destructive/20"
            )}
            error={isPastDate}
          />
        </div>
      </div>

      {isPastDate && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <Info className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">
            A data selecionada está no passado. Se continuar, o post será publicado imediatamente.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onSchedule}
              disabled={!hasValidDateTime || isLoading}
              className={cn(
                // Glassmorfismo base
                "min-h-[36px] px-6 py-2",
                "bg-primary/5 backdrop-blur-md",
                "border border-primary/30",
                "shadow-lg shadow-primary/5",
                
                // Tipografia e layout
                "text-sm font-medium text-primary",
                "flex items-center justify-center gap-2",
                "whitespace-nowrap",
                
                // Estados hover
                "hover:bg-primary/15 hover:border-primary/50",
                "hover:shadow-xl hover:shadow-primary/10",
                "transition-all duration-300",
                
                // Estado disabled
                !hasValidDateTime && "opacity-50 cursor-not-allowed hover:bg-primary/5"
              )}
            >
              <Calendar className="h-4 w-4" />
              {isLoading ? 'Agendando...' : 'Agendar Publicação'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {!hasValidDateTime 
                ? "Preencha data e hora para agendar"
                : isPastDate 
                ? "Será publicado imediatamente (data no passado)"
                : "Agendar publicação para a data especificada"
              }
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}