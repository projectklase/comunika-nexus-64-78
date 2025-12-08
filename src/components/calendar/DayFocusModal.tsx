import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCalendarModal, MODAL_IDS } from './CalendarModalManager';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDayFocusShortcuts } from '@/hooks/useKeyboardShortcuts';
import { AuditService } from '@/services/audit-service';
import { useWeightsEnabled } from '@/hooks/useWeightsEnabled';
import { 
  X,
  Calendar as CalendarIcon, 
  FileText, 
  FolderOpen, 
  ClipboardCheck,
  Clock,
  MapPin,
  Users,
  ExternalLink,
  CheckCircle,
  Edit,
  Eye,
  Plus,
  PartyPopper
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { useDayFocusModal } from '@/hooks/useDayFocusModal';
import { useToast } from '@/hooks/use-toast';
import { PostComposer } from '@/components/feed/PostComposer';
import { postStore } from '@/stores/post-store';
import { PostInput, PostType } from '@/types/post';
import { 
  computeDayFocusData, 
  DayItemFilter, 
  getDayItemDisplayType, 
  getDayItemColor 
} from '@/utils/day-focus-data';
import { activityDrawerStore, dayDrawerStore } from '@/utils/activity-drawer-handler';
import { NormalizedCalendarEvent } from '@/utils/calendar-events';
import { logAudit } from '@/stores/audit-store';
import { isHoliday } from '@/utils/br-holidays';
import { HolidayBanner } from './HolidayBanner';

const typeIcons = {
  EVENTO: CalendarIcon,
  ATIVIDADE: FileText,
  TRABALHO: FolderOpen,
  PROVA: ClipboardCheck,
};

const filterLabels = {
  all: 'Todos',
  events: 'Eventos',
  activities: 'Atividades',
  trabalhos: 'Trabalhos',
  provas: 'Provas',
};

export function DayFocusModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const weightsEnabled = useWeightsEnabled();
  const { isOpen, date, closeModal } = useDayFocusModal();
  const { isModalOpen, openModal, closeModal: closeCalendarModal } = useCalendarModal();
  const { posts } = usePosts({ status: user?.role === 'aluno' ? 'PUBLISHED' : undefined });
  
  const [activeFilter, setActiveFilter] = useState<DayItemFilter>('all');
  const showPostComposer = isModalOpen(MODAL_IDS.POST_COMPOSER);

  // Keyboard shortcuts
  useDayFocusShortcuts(
    isOpen,
    () => {
      if (canCreatePost) {
        openModal(MODAL_IDS.POST_COMPOSER, { date });
        if (user) {
          AuditService.trackKeyboardShortcut(user.id, {
            key: 'n',
            action: 'open_composer',
            context: 'day_focus'
          });
        }
      }
    },
    () => {
      // Edit functionality could be added later
    },
    () => closeModal(),
    false
  );

  // Get allowed types based on user role
  const getAllowedTypes = (): PostType[] => {
    switch (user?.role) {
      case 'secretaria':
        return ['AVISO', 'COMUNICADO', 'EVENTO'];
      case 'professor':
        return ['ATIVIDADE', 'TRABALHO', 'PROVA'];
      default:
        return [];
    }
  };

  const canCreatePost = user?.role === 'secretaria' || user?.role === 'professor';

  const handleCardClick = useCallback((event: NormalizedCalendarEvent) => {
    if (!event.clickable) return;
    
    // Close the old day drawer
    dayDrawerStore.close();

    // Open the activity drawer directly (unified implementation)
    activityDrawerStore.open({
      postId: event.postId,
      classId: event.classId,
      mode: 'calendar',
      type: event.type,
      subtype: event.subtype,
      status: event.status,
    });

    // Log audit event
    if (user) {
      logAudit({
        action: 'READ',
        entity: 'POST',
        entity_id: event.postId,
        entity_label: event.meta.title,
        actor_id: user.id,
        actor_name: user.name,
        actor_email: user.email,
        actor_role: user.role,
        scope: event.meta.audience === 'GLOBAL' ? 'GLOBAL' : `CLASS:${event.classId}`,
        meta: { 
          post_type: event.subtype,
          source: 'day_focus_modal',
          surface: 'calendar'
        }
      });
    }
  }, [navigate, user]);

  // Memoize dayData computation to prevent flickering
  const dayData = useMemo(() => {
    if (!isOpen || !date) return null;
    
    return computeDayFocusData(date, posts, user?.role, {
      activeFilter,
      events: true,
      deadlines: true,
    });
  }, [isOpen, date, posts, user?.role, activeFilter]);

  // Reset filter when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveFilter('all');
    }
  }, [isOpen]);

  // Early returns after all hooks
  if (!isOpen || !date || !dayData) return null;

  const getEventTime = (event: NormalizedCalendarEvent) => {
    if (event.type === 'event') {
      const isAllDay = event.startDate.getHours() === 0 && event.startDate.getMinutes() === 0;
      if (isAllDay) return 'Todo dia';
      
      if (event.meta.eventEndAt) {
        const endDate = new Date(event.meta.eventEndAt);
        return `${format(event.startDate, 'HH:mm')} - ${format(endDate, 'HH:mm')}`;
      }
      return format(event.startDate, 'HH:mm');
    }
    
    return `Prazo: ${format(event.startDate, 'HH:mm')}`;
  };

  const getStatusBadge = (event: NormalizedCalendarEvent) => {
    if (event.status === 'SCHEDULED') {
      return <Badge variant="outline" className="text-xs">Agendado</Badge>;
    }
    return null;
  };

  const title = format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0 bg-background border border-border/30 shadow-2xl [&>button]:hidden">
        <DialogTitle className="sr-only">Dia em Foco</DialogTitle>
        <DialogDescription className="sr-only">
          Modal para visualizar e gerenciar eventos e atividades do dia selecionado
        </DialogDescription>
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold gradient-text">
                Dia em Foco
              </h2>
              <p className="text-muted-foreground mt-1">
                {title}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {canCreatePost && (
                <Button
                  onClick={() => openModal(MODAL_IDS.POST_COMPOSER, { date })}
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Post
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => closeModal()}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Counters */}
          <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-muted-foreground">
            <span>Total: {dayData?.counts.total || 0}</span>
            {(dayData?.counts.events || 0) > 0 && <span>• Eventos: {dayData.counts.events}</span>}
            {(dayData?.counts.activities || 0) > 0 && <span>• Atividades: {dayData.counts.activities}</span>}
            {(dayData?.counts.trabalhos || 0) > 0 && <span>• Trabalhos: {dayData.counts.trabalhos}</span>}
            {(dayData?.counts.provas || 0) > 0 && <span>• Provas: {dayData.counts.provas}</span>}
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(filterLabels).map(([key, label]) => {
              const isActive = activeFilter === key;
              const count = key === 'all' ? (dayData?.counts.total || 0) :
                           key === 'events' ? (dayData?.counts.events || 0) :
                           key === 'activities' ? (dayData?.counts.activities || 0) :
                           key === 'trabalhos' ? (dayData?.counts.trabalhos || 0) :
                           (dayData?.counts.provas || 0);

              if (key !== 'all' && count === 0) return null;

              return (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key as DayItemFilter)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                    'border border-border/30',
                    isActive 
                      ? 'bg-primary text-primary-foreground border-primary/50' 
                      : 'bg-card hover:bg-accent hover:border-accent'
                  )}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <ScrollArea className="flex-1 px-6 pb-6">
          {/* Holiday Banner */}
          {(() => {
            const holiday = isHoliday(date);
            return holiday ? <div className="pt-4"><HolidayBanner holiday={holiday} /></div> : null;
          })()}
          
          {!dayData || dayData.filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              {(() => {
                const holiday = isHoliday(date);
                if (holiday) {
                  return (
                    <>
                      <PartyPopper className="h-16 w-16 text-amber-400/70 mb-4" />
                      <h3 className="text-lg font-semibold text-foreground">
                        🎉 Dia de Feriado!
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Nenhum compromisso agendado - aproveite o descanso!
                      </p>
                    </>
                  );
                }
                return (
                  <>
                    <CalendarIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold text-muted-foreground">
                      {activeFilter === 'all' ? 'Nenhum item para este dia' : `Nenhum ${filterLabels[activeFilter].toLowerCase()} para este dia`}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      {activeFilter !== 'all' && (dayData?.allItems.length || 0) > 0 
                        ? 'Tente alterar o filtro para ver outros tipos de itens.'
                        : 'Este dia está livre de eventos e atividades.'}
                    </p>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
              {dayData.filteredItems.map((event) => {
                const Icon = typeIcons[event.subtype as keyof typeof typeIcons];
                const color = getDayItemColor(event);
                const displayType = getDayItemDisplayType(event);
                
                return (
                  <Card
                    key={event.id}
                    className={cn(
                      'glass-card border cursor-pointer transition-all duration-200',
                      'hover:shadow-lg hover:scale-[1.02]',
                      event.clickable 
                        ? 'hover:border-primary/50' 
                        : 'opacity-75 cursor-not-allowed',
                      color === 'amber' && 'border-amber-500/30 hover:border-amber-500/60',
                      color === 'blue' && 'border-blue-500/30 hover:border-blue-500/60',
                      color === 'orange' && 'border-orange-500/30 hover:border-orange-500/60',
                      color === 'red' && 'border-red-500/30 hover:border-red-500/60'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(event);
                    }}
                  >
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Icon className={cn(
                            'h-4 w-4 shrink-0',
                            color === 'amber' && 'text-amber-400',
                            color === 'blue' && 'text-blue-400',
                            color === 'orange' && 'text-orange-400',
                            color === 'red' && 'text-red-400'
                          )} />
                          <Badge variant="outline" className="text-xs">
                            {displayType}
                          </Badge>
                        </div>
                        {getStatusBadge(event)}
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-sm leading-tight mb-2 line-clamp-2">
                        {event.meta.title}
                      </h3>

                      {/* Details */}
                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        {/* Time */}
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{getEventTime(event)}</span>
                        </div>

                        {/* Location (for events) */}
                        {event.meta.eventLocation && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{event.meta.eventLocation}</span>
                          </div>
                        )}

                        {/* Author */}
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3 w-3 shrink-0" />
                          <span className="truncate">{event.meta.author}</span>
                        </div>

                        {/* Weight (for activities) */}
                        {weightsEnabled && event.meta.weight !== null && event.meta.weight !== undefined && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px]">⚖️</span>
                            <span>Peso: {event.meta.weight}</span>
                          </div>
                        )}

                        {/* Description preview */}
                        {event.meta.body && (
                          <div className="mt-2 pt-2 border-t border-border/20">
                            <p className="text-xs text-muted-foreground line-clamp-3">{event.meta.body}</p>
                          </div>
                        )}
                      </div>

                      {/* Actions - use unified actions component */}
                      {event.clickable && (
                        <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-border/20">
                          <Button 
                            size="sm" 
                            variant="default" 
                            className="text-xs h-9 min-h-[44px] sm:min-h-[32px] flex-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick(event);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {event.type === 'event' ? 'Ver evento' : 'Ver atividade'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        {/* Post Composer Modal */}
        <Dialog open={showPostComposer} onOpenChange={(open) => {
          if (!open) {
            // Attempt to close - check for unsaved changes
            const composer = document.querySelector('[data-composer="dayfocus"]') as any;
            if (composer?.onCloseAttempt?.implementation) {
              composer.onCloseAttempt.implementation().then((canClose: boolean) => {
                if (canClose) {
                  closeCalendarModal(MODAL_IDS.POST_COMPOSER);
                }
              });
            } else {
              closeCalendarModal(MODAL_IDS.POST_COMPOSER);
            }
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="gradient-text">
                Criar Novo Post para {format(date, "d 'de' MMMM", { locale: ptBR })}
              </DialogTitle>
            </DialogHeader>
            <div data-composer="dayfocus">
              <PostComposer
                allowedTypes={getAllowedTypes()}
                preselectedDate={date}
                onSubmit={async (postInput: PostInput) => {
                  if (!user) return;
                  
                  await postStore.create(postInput, user.name, user.id, user.role);
                  closeCalendarModal(MODAL_IDS.POST_COMPOSER);
                  
                  toast({
                    title: "Post criado",
                    description: "O post foi criado com sucesso.",
                  });
                }}
                onCancel={() => closeCalendarModal(MODAL_IDS.POST_COMPOSER)}
              />
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}