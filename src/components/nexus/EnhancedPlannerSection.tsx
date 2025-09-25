import { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Sparkles, 
  AlertTriangle, 
  Clock,
  Scissors,
  Shuffle,
  Settings
} from 'lucide-react';
import { TimeRibbon } from './TimeRibbon';
import { EmptyPlannerWeek } from './EmptyStates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useStudentPlannerStore } from '@/stores/studentPlannerStore';
import { useActivityPriority } from '@/hooks/useActivityPriority';
import { useAutoSuggestions } from '@/hooks/useAutoSuggestions';
import { useConflictDetector } from '@/hooks/useConflictDetector';
import { usePosts } from '@/hooks/usePosts';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMetricsTracker } from '@/hooks/useNexusMetrics';
import { PriorityBadge } from './PriorityBadge';
import { ConflictIndicator } from './ConflictIndicator';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return [`${hour}:00`, `${hour}:30`];
}).flat().slice(16, 44); // 8:00 to 22:00

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function EnhancedPlannerSection() {
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showGrid, setShowGrid] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragData, setDragData] = useState<{ date?: string; time?: string }>({});
  
  const {
    plannedBlocks,
    preferences,
    updatePreferences,
    getBlocksForWeek,
    addBlock,
    removeBlock,
    suggestTimeSlots
  } = useStudentPlannerStore();

  const { getHighRiskActivities, getTopPriorityActivities, getActivityPriority } = useActivityPriority();
  const { 
    suggestedBlocks,
    isGenerating,
    generateWeeklySuggestions,
    acceptAllSuggestions,
    discardAllSuggestions,
    breakIntoSteps
  } = useAutoSuggestions();
  const { smartSnooze } = useConflictDetector();
  const { trackDrag, trackAccept, trackSnooze } = useMetricsTracker();

  const allPosts = usePosts({ status: 'PUBLISHED' });

  // Get activities for drag source
  const activities = useMemo(() => {
    return allPosts.filter(post => 
      ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type) && 
      post.dueAt
    );
  }, [allPosts]);

  const highRiskActivities = getHighRiskActivities();
  const topPriorityActivities = getTopPriorityActivities();

  // Get week dates
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(currentWeek, i);
      return {
        date,
        dateStr: format(date, 'yyyy-MM-dd'),
        dayName: WEEKDAYS[date.getDay()],
        dayNumber: format(date, 'd'),
        isToday: format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
      };
    });
  }, [currentWeek]);

  // Get blocks for current week
  const weekBlocks = useMemo(() => {
    const startDate = format(currentWeek, 'yyyy-MM-dd');
    return getBlocksForWeek(startDate);
  }, [currentWeek, getBlocksForWeek, plannedBlocks]);

  const handleAutoSuggestionsToggle = (enabled: boolean) => {
    updatePreferences({ autoSuggestionsEnabled: enabled });
    
    if (enabled && suggestedBlocks.length === 0) {
      generateWeeklySuggestions();
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'a',
      action: () => handleAutoSuggestionsToggle(!preferences.autoSuggestionsEnabled),
      description: 'Toggle auto suggestions'
    }
  ]);

  const handleBreakIntoSteps = (activityId: string) => {
    const stepBlocks = breakIntoSteps(activityId);
    const activity = activities.find(a => a.id === activityId);
    
    toast({
      title: 'Passos criados',
      description: `${stepBlocks.length} blocos sugeridos para "${activity?.title}"`
    });
  };

  const handleSmartSnooze = (blockId: string) => {
    const block = plannedBlocks.find(b => b.id === blockId);
    if (block) {
      const activity = activities.find(a => a.id === block.postId);
      const success = smartSnooze(blockId, activity?.dueAt);
      
      trackSnooze(success ? 'auto_resolved' : 'failed');
      
      toast({
        title: success ? 'Bloco adiado' : 'Erro ao adiar',
        description: success ? 
          'Bloco movido para próximo slot disponível' : 
          'Não foi possível encontrar um slot livre'
      });
    }
  };

  const handleAcceptAllSuggestions = () => {
    acceptAllSuggestions();
    trackAccept('all_suggestions', suggestedBlocks.length);
  };

  const getActivityTitle = (postId: string) => {
    if (postId === 'quick-block') return 'Bloco de Estudo';
    const activity = activities.find(a => a.id === postId);
    return activity?.title || 'Atividade';
  };

  const handleAddQuickBlock = (dateStr: string, timeSlot: string) => {
    const duration = preferences.blockSize;
    const startMinutes = parseInt(timeSlot.split(':')[0]) * 60 + parseInt(timeSlot.split(':')[1]);
    const endMinutes = startMinutes + duration;
    const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

    addBlock({
      postId: 'quick-block',
      date: dateStr,
      startTime: timeSlot,
      endTime: endTime,
      type: 'study'
    });

    trackDrag('quick_add', `${dateStr}_${timeSlot}`);

    toast({
      title: 'Bloco adicionado',
      description: `Bloco de estudo criado para ${timeSlot}`
    });
  };

  const renderTimeSlots = (dateInfo: typeof weekDates[0]) => {
    const dayBlocks = weekBlocks.filter(block => block.date === dateInfo.dateStr);
    
    return (
      <div className="space-y-1">
        {TIME_SLOTS.map(timeSlot => {
          const existingBlock = dayBlocks.find(block => block.startTime === timeSlot);
          
          return (
            <div
              key={timeSlot}
              className={cn(
                "min-h-[40px] border border-border/30 rounded-md p-2 text-xs",
                "transition-colors duration-200",
                existingBlock
                  ? "bg-primary/10 border-primary/30"
                  : "bg-background/50 hover:bg-muted/30 cursor-pointer"
              )}
              onClick={() => !existingBlock && handleAddQuickBlock(dateInfo.dateStr, timeSlot)}
              onMouseEnter={() => setDragData({ date: dateInfo.dateStr, time: timeSlot })}
              onMouseLeave={() => setDragData({})}
            >
              {existingBlock ? (
                <div className="space-y-1">
                  <div className="font-medium text-foreground truncate">
                    {getActivityTitle(existingBlock.postId)}
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {existingBlock.type === 'study' && 'Estudar'}
                      {existingBlock.type === 'execution' && 'Fazer'}
                      {existingBlock.type === 'review' && 'Revisar'}
                    </Badge>
                    <ConflictIndicator
                      blockId={existingBlock.id}
                      date={existingBlock.date}
                      startTime={existingBlock.startTime}
                      endTime={existingBlock.endTime}
                      className="ml-1"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBlock(existingBlock.id);
                      }}
                      className="h-4 w-4 p-0 hover:bg-destructive/20 hover:text-destructive"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground opacity-50">
                  {timeSlot}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Time Ribbon */}
      <TimeRibbon 
        currentWeek={currentWeek}
        highlightOptimalSlots={isDragging}
        dragDate={dragData.date}
        dragTime={dragData.time}
      />
      {/* High Risk Banner */}
      {highRiskActivities.length > 0 && (
        <Card className="glass-card border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 animate-pulse" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  {highRiskActivities.length} atividade(s) em risco alto
                </div>
                <div className="text-xs text-muted-foreground">
                  {highRiskActivities.map(activity => 
                    activities.find(a => a.id === activity.activityId)?.title
                  ).filter(Boolean).join(', ')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek(prev => addDays(prev, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium min-w-[200px] text-center">
            {format(currentWeek, "dd 'de' MMMM", { locale: ptBR })} - {format(addDays(currentWeek, 6), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek(prev => addDays(prev, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* View Toggle & Settings */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="auto-suggestions"
              checked={preferences.autoSuggestionsEnabled}
              onCheckedChange={handleAutoSuggestionsToggle}
            />
            <Label htmlFor="auto-suggestions" className="text-sm">
              Auto-sugestões
            </Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
          >
            {showGrid ? 'Lista' : 'Grade'}
          </Button>
        </div>
      </div>

      {/* Auto-suggestions Panel */}
      {preferences.autoSuggestionsEnabled && (
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Sugestões Inteligentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestedBlocks.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {suggestedBlocks.length} blocos sugeridos para esta semana
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={discardAllSuggestions}
                    >
                      Descartar
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleAcceptAllSuggestions}
                    >
                      Aceitar Semana
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestedBlocks.slice(0, 4).map(suggestion => (
                    <div 
                      key={suggestion.id}
                      className="flex items-center gap-3 p-2 glass-card rounded-lg border-dashed border-2"
                    >
                      <div className="text-xs font-mono text-muted-foreground">
                        {format(new Date(suggestion.date), "dd/MM")} {suggestion.startTime}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {suggestion.activityTitle}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {suggestion.stepLabel}
                        </div>
                      </div>
                      <Badge variant={suggestion.type === 'execution' ? 'default' : 'secondary'} className="text-xs">
                        {suggestion.type === 'study' && 'Estudar'}
                        {suggestion.type === 'execution' && 'Fazer'}
                        {suggestion.type === 'review' && 'Revisar'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            ) : weekBlocks.length === 0 ? (
              <EmptyPlannerWeek onGenerateSuggestions={generateWeeklySuggestions} />
            ) : (
              <div className="text-center py-4">
                <Button
                  variant="outline"
                  onClick={generateWeeklySuggestions}
                  disabled={isGenerating}
                  className="glass-card"
                >
                  {isGenerating ? (
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Gerar Sugestões
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Priority Activities */}
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Atividades por Prioridade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {topPriorityActivities.slice(0, 3).map(priorityInfo => {
            const activity = activities.find(a => a.id === priorityInfo.activityId);
            if (!activity) return null;
            
            return (
              <div 
                key={activity.id}
                className="p-3 glass-card rounded-lg border transition-colors hover:bg-muted/20"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {activity.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {priorityInfo.daysUntilDue === 0 ? 'Vence hoje' : 
                       priorityInfo.daysUntilDue === 1 ? 'Vence amanhã' :
                       `${priorityInfo.daysUntilDue} dias restantes`}
                    </div>
                  </div>
                  <PriorityBadge 
                    risk={priorityInfo.risk}
                    score={priorityInfo.score}
                    className="ml-2"
                  />
                </div>

                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs flex-1"
                    onClick={() => handleBreakIntoSteps(activity.id)}
                  >
                    <Scissors className="h-3 w-3 mr-1" />
                    Quebrar em Passos
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {showGrid ? (
        /* Weekly Grid */
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((dateInfo) => (
            <Card
              key={dateInfo.dateStr}
              className={cn(
                "glass-card",
                dateInfo.isToday && "border-primary/50 bg-primary/5"
              )}
            >
              <CardHeader 
                className="pb-2 px-3 py-2"
                {...(dateInfo.isToday && { 'data-section': 'today' })}
              >
                <CardTitle className="text-sm text-center">
                  <div className="font-medium">{dateInfo.dayName}</div>
                  <div className={cn(
                    "text-xs",
                    dateInfo.isToday ? "text-primary font-bold" : "text-muted-foreground"
                  )}>
                    {dateInfo.dayNumber}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {renderTimeSlots(dateInfo)}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Blocos da Semana
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {weekBlocks.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Nenhum bloco agendado para esta semana
              </div>
            ) : (
              weekBlocks.map(block => (
                <div 
                  key={block.id}
                  className="flex items-center gap-3 p-3 glass-card rounded-lg"
                >
                  <div className="text-sm font-mono text-muted-foreground">
                    {format(new Date(block.date), "dd/MM")} {block.startTime}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {getActivityTitle(block.postId)}
                    </div>
                  </div>
                  
                  <ConflictIndicator
                    blockId={block.id}
                    date={block.date}
                    startTime={block.startTime}
                    endTime={block.endTime}
                  />
                  
                  <Badge className={cn("text-xs", {
                    'bg-blue-500/20 text-blue-400 border-blue-500/30': block.type === 'study',
                    'bg-green-500/20 text-green-400 border-green-500/30': block.type === 'execution',
                    'bg-purple-500/20 text-purple-400 border-purple-500/30': block.type === 'review'
                  })}>
                    {block.type === 'study' && 'Estudar'}
                    {block.type === 'execution' && 'Fazer'}
                    {block.type === 'review' && 'Revisar'}
                  </Badge>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSmartSnooze(block.id)}
                    title="Snooze inteligente"
                  >
                    <Shuffle className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}