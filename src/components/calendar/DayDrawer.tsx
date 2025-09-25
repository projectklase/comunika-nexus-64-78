import { CalendarEvent } from '@/hooks/useCalendarData';
import { Holiday } from '@/utils/br-holidays';
import {
  AppDialog,
  AppDialogContent,
  AppDialogDescription,
  AppDialogHeader,
  AppDialogTitle,
} from '@/components/ui/app-dialog';
import { EventChip } from './EventChip';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

interface DayDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  events: CalendarEvent[];
  holiday?: Holiday | null;
}

export function DayDrawer({ isOpen, onClose, selectedDate, events, holiday }: DayDrawerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!selectedDate) return null;

  const handleEventClick = (event: CalendarEvent) => {
    const basePath = user?.role === 'aluno' ? '/feed' : `/${user?.role}/feed`;
    navigate(`${basePath}?focus=${event.id}`);
    onClose();
  };

  const dayEvents = events.filter(event => {
    const eventDate = event.startDate.toDateString();
    const selectedDateStr = selectedDate.toDateString();
    return eventDate === selectedDateStr;
  });

  const eventsByType = dayEvents.reduce((acc, event) => {
    if (!acc[event.type]) acc[event.type] = [];
    acc[event.type].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  return (
    <AppDialog open={isOpen} onOpenChange={(open) => !open && onClose()} modalId="day-drawer">
      <AppDialogContent className="glass-card border-border/50 max-w-[540px]">
        <AppDialogHeader className="space-y-3">
          <AppDialogTitle className="gradient-text">
            {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </AppDialogTitle>
          <AppDialogDescription>
            {format(selectedDate, 'EEEE', { locale: ptBR })}
          </AppDialogDescription>
        </AppDialogHeader>

        <div className="mt-6 space-y-6">
          {holiday && (
            <div className="glass p-4 rounded-lg border border-amber-500/30">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-amber-400" />
                <span className="font-medium text-amber-400">Feriado</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{holiday.name}</p>
            </div>
          )}

          {eventsByType.event && eventsByType.event.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-secondary" />
                <h3 className="font-semibold text-secondary">Eventos</h3>
                <Badge variant="secondary" className="text-xs">
                  {eventsByType.event.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {eventsByType.event.map(event => (
                  <EventChip
                    key={event.id}
                    event={event}
                    onClick={() => handleEventClick(event)}
                    className="w-full justify-start"
                  />
                ))}
              </div>
            </div>
          )}

          {eventsByType.deadline && eventsByType.deadline.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                <h3 className="font-semibold text-amber-400">Atividades</h3>
                <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                  {eventsByType.deadline.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {eventsByType.deadline.map(event => (
                  <EventChip
                    key={event.id}
                    event={event}
                    onClick={() => handleEventClick(event)}
                    className="w-full justify-start"
                  />
                ))}
              </div>
            </div>
          )}

          {dayEvents.length === 0 && !holiday && (
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">Nenhum evento neste dia</p>
            </div>
          )}
        </div>
      </AppDialogContent>
    </AppDialog>
  );
}