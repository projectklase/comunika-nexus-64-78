import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Clock, 
  FileText, 
  FolderOpen, 
  ClipboardCheck, 
  Paperclip,
  CheckCircle2,
  Circle,
  ExternalLink,
  Filter,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';

import { Post } from '@/types/post';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { filterActivitiesByType } from '@/utils/day-activity-counter';
import { useWeightsEnabled } from '@/hooks/useWeightsEnabled';
import { activityDrawerStore } from '@/utils/activity-drawer-handler';

interface DaySummarySheetProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  activities: Post[];
  isMobile?: boolean;
}

const typeIcons = {
  ATIVIDADE: FileText,
  TRABALHO: FolderOpen,
  PROVA: ClipboardCheck
};

const typeColors = {
  ATIVIDADE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  TRABALHO: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  PROVA: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const typeLabels = {
  ATIVIDADE: 'Atividades',
  TRABALHO: 'Trabalhos', 
  PROVA: 'Provas'
};

export function DaySummarySheet({ 
  isOpen, 
  onClose, 
  date, 
  activities,
  isMobile = false 
}: DaySummarySheetProps) {
  const navigate = useNavigate();
  const weightsEnabled = useWeightsEnabled();
  const [activeTab, setActiveTab] = useState('ALL');
  const [isExpanded, setIsExpanded] = useState(() => {
    return localStorage.getItem('day-summary-expanded') === 'true';
  });

  // Mock delivery status - in real app this would come from delivery store
  const [deliveryStatus, setDeliveryStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    localStorage.setItem('day-summary-expanded', isExpanded.toString());
  }, [isExpanded]);

  if (!date) return null;

  const filteredActivities = filterActivitiesByType(activities, 
    activeTab === 'ALL' ? ['ALL'] : [activeTab]
  );

  const activityCounts = {
    ALL: activities.length,
    ATIVIDADE: activities.filter(a => a.type === 'ATIVIDADE').length,
    TRABALHO: activities.filter(a => a.type === 'TRABALHO').length,
    PROVA: activities.filter(a => a.type === 'PROVA').length
  };

  const handleToggleDelivery = (activityId: string) => {
    setDeliveryStatus(prev => ({
      ...prev,
      [activityId]: !prev[activityId]
    }));
  };

  const handleOpenActivity = (activity: Post) => {
    onClose();
    // Use unified activity drawer handler
    activityDrawerStore.open({
      postId: activity.id,
      classId: activity.classId,
      mode: 'calendar',
      type: 'deadline',
      subtype: activity.type,
      status: activity.status,
    });

    // Update URL without page reload
    const params = new URLSearchParams(window.location.search);
    params.set('drawer', 'activity');
    params.set('postId', activity.id);
    
    if (activity.classId && activity.classId !== 'ALL_CLASSES') {
      params.set('classId', activity.classId);
    }
    
    const currentPath = window.location.pathname;
    navigate(`${currentPath}?${params.toString()}`, { replace: true });
  };

  const handleOpenAllAsList = () => {
    const dateStr = format(date, 'yyyy-MM-dd');
    navigate(`/aluno/atividades?date=${dateStr}`);
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'HH:mm', { locale: ptBR });
  };

  const getActivityStatus = (activity: Post) => {
    const isDelivered = deliveryStatus[activity.id];
    const now = new Date();
    const dueDate = new Date(activity.dueAt!);
    const isOverdue = now > dueDate && !isDelivered;

    if (isDelivered) return { label: 'Entregue', color: 'text-green-400' };
    if (isOverdue) return { label: 'Atrasada', color: 'text-red-400' };
    return { label: 'Pendente', color: 'text-yellow-400' };
  };

  const Content = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border/30 pb-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">
            {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h2>
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-2"
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {activities.length} atividade{activities.length !== 1 ? 's' : ''} encontrada{activities.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-4 w-full mb-4">
          <TabsTrigger value="ALL" className="text-xs">
            Todas ({activityCounts.ALL})
          </TabsTrigger>
          <TabsTrigger value="ATIVIDADE" className="text-xs">
            Atividades ({activityCounts.ATIVIDADE})
          </TabsTrigger>
          <TabsTrigger value="TRABALHO" className="text-xs">
            Trabalhos ({activityCounts.TRABALHO})
          </TabsTrigger>
          <TabsTrigger value="PROVA" className="text-xs">
            Provas ({activityCounts.PROVA})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="flex-1 mt-0">
          <ScrollArea className="h-full">
            {filteredActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Filter className="h-12 w-12 mb-2 opacity-50" />
                <p>Nenhuma atividade encontrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActivities.map((activity) => {
                  const Icon = typeIcons[activity.type as keyof typeof typeIcons];
                  const colorClass = typeColors[activity.type as keyof typeof typeColors];
                  const status = getActivityStatus(activity);
                  const isDelivered = deliveryStatus[activity.id];

                  return (
                    <div
                      key={activity.id}
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className={cn('flex items-center gap-1 shrink-0', colorClass)}>
                          <Icon className="h-3 w-3" />
                          {activity.type}
                        </Badge>
                        
                        <div className="flex-1 space-y-2 min-w-0">
                          <div>
                            <h4 className="font-medium leading-tight">{activity.title}</h4>
                            {activity.body && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {activity.body}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{formatDateTime(activity.dueAt!)}</span>
                            </div>

                            <div className={cn('flex items-center gap-1', status.color)}>
                              <span className="text-xs font-medium">{status.label}</span>
                            </div>

                            {weightsEnabled && 
                             activity.activityMeta?.peso !== null && 
                             activity.activityMeta?.peso !== undefined && 
                             activity.activityMeta?.usePeso !== false && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <span>⚖️</span>
                                <span className="text-xs">Peso: {activity.activityMeta.peso}</span>
                              </div>
                            )}

                            {activity.attachments && activity.attachments.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Paperclip className="h-3 w-3 mr-1" />
                                {activity.attachments.length}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              size="xs"
                              variant={isDelivered ? "default" : "outline"}
                              onClick={() => handleToggleDelivery(activity.id)}
                              className="flex items-center gap-1 min-w-0 max-w-[6rem] sm:max-w-[8rem]"
                            >
                              {isDelivered ? (
                                <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                              ) : (
                                <Circle className="h-3 w-3 flex-shrink-0" />
                              )}
                              <span className="truncate text-xs">
                                {isDelivered ? 'Entregue' : 'Entregar'}
                              </span>
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenActivity(activity)}
                              className="flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Abrir
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="border-t border-border/30 pt-4 mt-4">
        <div className="flex flex-col sm:flex-row gap-2 justify-between">
          <Button
            variant="secondary"
            onClick={handleOpenAllAsList}
            className="glass-card border-border/50 bg-card/80 hover:bg-card/90 hover:border-primary/20 backdrop-blur-sm min-h-[44px] rounded-xl"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir todas como lista
          </Button>
          
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent hover:border-border/30 min-h-[44px] rounded-xl"
            >
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent 
          side="bottom" 
          className="h-[85vh] rounded-t-lg"
        >
          <SheetHeader className="pb-4">
            <SheetTitle className="sr-only">
              Resumo do dia {format(date, 'd/MM/yyyy')}
            </SheetTitle>
          </SheetHeader>
          <Content />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "max-h-[85vh] flex flex-col",
          isExpanded ? "max-w-[1200px]" : "max-w-[960px]"
        )}
      >
        <DialogHeader className="pb-4">
          <DialogTitle className="sr-only">
            Resumo do dia {format(date, 'd/MM/yyyy')}
          </DialogTitle>
        </DialogHeader>
        <Content />
      </DialogContent>
    </Dialog>
  );
}