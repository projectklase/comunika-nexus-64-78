import { Calendar } from '@/components/ui/calendar';
import { ClassCalendarEvent } from '@/hooks/useClassCalendarData';
import { ClassCalendarEventChip } from './ClassCalendarEventChip';
import { ActivityDrawer } from './ActivityDrawer';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { postStore } from '@/stores/post-store';
import { toast } from '@/hooks/use-toast';
import { 
  format, 
  isSameDay, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  addDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClassCalendarGridProps {
  classId: string;
  currentDate: Date;
  view: 'month' | 'week';
  events: ClassCalendarEvent[];
  userRole: string;
}

export function ClassCalendarGrid({
  classId,
  currentDate,
  view,
  events,
  userRole
}: ClassCalendarGridProps) {
  const { user } = useAuth();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // Helper function to check if user can move an event/activity
  const canUserMovePost = (post: any): boolean => {
    if (!user) return false;
    
    // Secretaria can move anything created by other secretaria members
    if (user.role === 'secretaria') {
      // Check if the post was created by a secretaria member
      const isSecretariaPost = post.authorName === 'Secretaria Central' || 
                              post.authorName?.includes('Secretaria') ||
                              post.audience === 'GLOBAL';
      return isSecretariaPost;
    }
    
    // Professor can only move posts they created themselves
    if (user.role === 'professor') {
      return post.authorName === user.name;
    }
    
    // Students cannot move anything
    return false;
  };

  const handleEventDrop = (e: React.DragEvent<HTMLDivElement>, targetDate: Date) => {
    try {
      e.preventDefault();
      
      const eventId = e.dataTransfer.getData('text/plain');
      console.log('Dragged event ID:', eventId);
      
      if (!eventId) {
        console.warn('No event ID found in drag data');
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível identificar o evento arrastado.',
        });
        return;
      }

      // Find event by post ID
      const event = events.find(e => e.post.id === eventId);
      
      if (!event) {
        console.warn('Event not found:', eventId);
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Evento não encontrado.',
        });
        return;
      }

      // Check permissions
      if (!canUserMovePost(event.post)) {
        const message = user?.role === 'professor' 
          ? 'Você só pode mover atividades criadas por você.'
          : 'Você não tem permissão para mover este item.';
        
        toast({
          variant: 'destructive',
          title: 'Acesso negado',
          description: message,
        });
        return;
      }

      // For activities, maintain the time but change the date
      const originalDue = event.dueDate;
      const targetDue = new Date(targetDate);
      targetDue.setHours(originalDue.getHours(), originalDue.getMinutes());

      const updateData = {
        dueAt: targetDue.toISOString()
      };

      console.log('Updating post:', event.post.id, 'with data:', updateData);

      // Update post in store
      const updated = postStore.update(event.post.id, updateData);

      if (updated) {
        toast({
          title: 'Atividade movida com sucesso',
          description: `${event.post.title} teve o prazo alterado para ${format(targetDue, 'd/MM/yyyy HH:mm', { locale: ptBR })}`,
        });
      } else {
        console.error('Failed to update post in store');
        toast({
          variant: 'destructive',
          title: 'Erro ao mover atividade',
          description: 'Não foi possível mover a atividade. Tente novamente.',
        });
      }
    } catch (error) {
      console.error('Error handling event drop:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Ocorreu um erro ao mover a atividade.',
      });
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.dueDate, date));
  };

  const handleEventClick = (event: ClassCalendarEvent) => {
    if (userRole === 'professor') {
      // Open activity drawer for professors too
      setSelectedPostId(event.post.id);
    } else {
      // Open activity detail drawer for students
      setSelectedPostId(event.post.id);
    }
  };

  if (view === 'week') {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-1">
          {/* Week header */}
          {weekDays.map(day => (
            <div key={day.toISOString()} className="p-2 text-center">
              <div className="text-sm font-medium text-muted-foreground">
                {format(day, 'EEE', { locale: ptBR })}
              </div>
              <div className="text-lg font-semibold">
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Week events */}
        <div className="grid grid-cols-7 gap-1 min-h-[300px]">
          {weekDays.map(day => {
            const dayEvents = getEventsForDate(day);
            return (
              <div 
                key={day.toISOString()} 
                className="p-2 border border-border/30 rounded-md bg-card/30 transition-all duration-200"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  // Add visual feedback on drag over
                  const element = e.currentTarget;
                  element.classList.add('ring-2', 'ring-primary/50', 'bg-primary/5', 'scale-[1.02]', 'transition-all', 'duration-200');
                }}
                onDragLeave={(e) => {
                  // Remove visual feedback when drag leaves
                  const element = e.currentTarget;
                  element.classList.remove('ring-2', 'ring-primary/50', 'bg-primary/5', 'scale-[1.02]', 'transition-all', 'duration-200');
                }}
                onDrop={(e) => {
                  // Remove visual feedback after drop
                  const element = e.currentTarget;
                  element.classList.remove('ring-2', 'ring-primary/50', 'bg-primary/5', 'scale-[1.02]', 'transition-all', 'duration-200');
                  handleEventDrop(e, day);
                }}
              >
                <div className="space-y-1">
                  {dayEvents.map(event => {
                    const isDraggableEvent = user ? canUserMovePost(event.post) : false;
                    
                    return (
                      <ClassCalendarEventChip
                        key={event.id}
                        event={event}
                        onClick={() => handleEventClick(event)}
                        compact={false}
                        isDraggable={isDraggableEvent}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <ActivityDrawer
          postId={selectedPostId}
          classId={classId}
          isOpen={!!selectedPostId}
          onClose={() => setSelectedPostId(null)}
        />
      </div>
    );
  }

  // Month view using the Calendar component
  return (
    <div className="space-y-4">
      <Calendar
        mode="single"
        selected={currentDate}
        onSelect={() => {}} // No selection behavior needed
        month={currentDate}
        className="w-full"
        components={{
          Day: ({ date, ...props }) => {
            const dayEvents = getEventsForDate(date);
            return (
              <div 
                {...props} 
                className="relative p-1 min-h-[80px] transition-all duration-200"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  // Add visual feedback on drag over
                  const element = e.currentTarget;
                  element.classList.add('ring-2', 'ring-primary/50', 'bg-primary/5', 'scale-[1.02]', 'transition-all', 'duration-200');
                }}
                onDragLeave={(e) => {
                  // Remove visual feedback when drag leaves
                  const element = e.currentTarget;
                  element.classList.remove('ring-2', 'ring-primary/50', 'bg-primary/5', 'scale-[1.02]', 'transition-all', 'duration-200');
                }}
                onDrop={(e) => {
                  // Remove visual feedback after drop
                  const element = e.currentTarget;
                  element.classList.remove('ring-2', 'ring-primary/50', 'bg-primary/5', 'scale-[1.02]', 'transition-all', 'duration-200');
                  handleEventDrop(e, date);
                }}
              >
                <div className="text-sm font-medium mb-1">
                  {format(date, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(event => {
                    const isDraggableEvent = user ? canUserMovePost(event.post) : false;
                    
                    return (
                      <ClassCalendarEventChip
                        key={event.id}
                        event={event}
                        onClick={() => handleEventClick(event)}
                        compact={true}
                        isDraggable={isDraggableEvent}
                      />
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayEvents.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          }
        }}
      />

      <ActivityDrawer
        postId={selectedPostId}
        classId={classId}
        isOpen={!!selectedPostId}
        onClose={() => setSelectedPostId(null)}
      />
    </div>
  );
}