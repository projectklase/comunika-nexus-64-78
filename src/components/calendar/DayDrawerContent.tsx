import { CalendarEvent } from '@/hooks/useCalendarData';
import { useWeightsEnabled } from '@/hooks/useWeightsEnabled';
import { useCalendarActions } from '@/hooks/useCalendarActions';
import { useAuth } from '@/contexts/AuthContext';
import { usePostViews } from '@/stores/post-views.store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Users, FileText, FolderOpen, ClipboardCheck, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DayDrawerContentProps {
  events: CalendarEvent[];
  selectedDate: Date | null;
}

const typeIcons = {
  AVISO: FileText,
  COMUNICADO: FileText,
  EVENTO: Users,
  ATIVIDADE: FileText,
  TRABALHO: FolderOpen,
  PROVA: ClipboardCheck
};

const typeColors = {
  AVISO: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  COMUNICADO: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  EVENTO: 'bg-green-500/20 text-green-400 border-green-500/30',
  ATIVIDADE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  TRABALHO: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  PROVA: 'bg-red-500/20 text-red-400 border-red-500/30'
};

export function DayDrawerContent({ events, selectedDate }: DayDrawerContentProps) {
  const weightsEnabled = useWeightsEnabled();
  const actions = useCalendarActions();
  const { user } = useAuth();
  const { recordPostView } = usePostViews();

  if (!selectedDate) return null;

  const sortedEvents = [...events].sort((a, b) => 
    a.startDate.getTime() - b.startDate.getTime()
  );

  return (
    <div className="space-y-4">
      <div className="text-center border-b pb-4">
        <h3 className="text-lg font-semibold">
          {format(selectedDate, 'EEEE, d \'de\' MMMM', { locale: ptBR })}
        </h3>
        <p className="text-sm text-muted-foreground">
          {events.length} evento(s) encontrado(s)
        </p>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nenhum evento neste dia</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedEvents.map(event => {
            const Icon = typeIcons[event.post.type];
            const colorClass = typeColors[event.post.type];

            return (
              <div
                key={event.id}
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className={cn('flex items-center gap-1', colorClass)}>
                    <Icon className="h-3 w-3" />
                    {event.post.type}
                  </Badge>
                  
                  <div className="flex-1 space-y-2">
                    <div>
                      <h4 className="font-medium">{event.post.title}</h4>
                      {event.post.body && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.post.body}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {event.type === 'deadline' 
                            ? `Prazo: ${format(event.startDate, 'HH:mm', { locale: ptBR })}`
                            : format(event.startDate, 'HH:mm', { locale: ptBR })}
                        </span>
                      </div>

                      {event.post.eventLocation && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{event.post.eventLocation}</span>
                        </div>
                      )}

                      {weightsEnabled && 
                       event.post.activityMeta?.peso !== null && 
                       event.post.activityMeta?.peso !== undefined && 
                       event.post.activityMeta?.usePeso !== false && (
                        <div className="flex items-center gap-1">
                          <span>⚖️</span>
                          <span>Peso: {event.post.activityMeta.peso}</span>
                        </div>
                      )}
                    </div>

                    {['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(event.post.type) && (
                      <div className="pt-2">
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => {
                            if (user) {
                              recordPostView(event.post.id, user, 'calendar', event.post.classIds?.[0] || event.post.classId);
                            }
                            actions.openDetails(event.post);
                          }}
                          className="h-9 min-h-[44px] sm:min-h-[36px] rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalhes
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}