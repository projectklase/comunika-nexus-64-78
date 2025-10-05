import { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Filter, Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useStudentPlannerStore } from '@/stores/studentPlannerStore';
import { usePosts } from '@/hooks/usePosts';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return [`${hour}:00`, `${hour}:30`];
}).flat().slice(16, 44); // 8:00 to 22:00

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function PlannerSection() {
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedTurma, setSelectedTurma] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  const {
    plannedBlocks,
    preferences,
    updatePreferences,
    getBlocksForWeek,
    addBlock,
    removeBlock,
    moveBlock,
    suggestTimeSlots
  } = useStudentPlannerStore();

  const { posts: allPosts } = usePosts({ status: 'PUBLISHED' });

  // Get activities for drag source
  const activities = useMemo(() => {
    return allPosts.filter(post => 
      ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type) && 
      post.dueAt
    );
  }, [allPosts]);

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

  const handlePreviousWeek = () => {
    setCurrentWeek(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => addDays(prev, 7));
  };

  const handleAddQuickBlock = (dateStr: string, timeSlot: string) => {
    const endTime = format(addDays(parseISO(`${dateStr}T${timeSlot}`), 0), 'HH:mm');
    const duration = preferences.blockSize;
    const endMinutes = parseInt(timeSlot.split(':')[0]) * 60 + parseInt(timeSlot.split(':')[1]) + duration;
    const finalEndTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

    addBlock({
      postId: 'quick-block', // Special ID for quick blocks
      date: dateStr,
      startTime: timeSlot,
      endTime: finalEndTime,
      type: 'study'
    });

    toast({
      title: 'Bloco adicionado',
      description: `Bloco de estudo criado para ${timeSlot}`
    });
  };

  const handleRemoveBlock = (blockId: string) => {
    removeBlock(blockId);
    toast({
      title: 'Bloco removido',
      description: 'Bloco foi removido do seu planner'
    });
  };

  const getActivityTitle = (postId: string) => {
    if (postId === 'quick-block') return 'Bloco de Estudo';
    const activity = activities.find(a => a.id === postId);
    return activity?.title || 'Atividade';
  };

  const getActivityClass = (postId: string) => {
    if (postId === 'quick-block') return '';
    const activity = activities.find(a => a.id === postId);
    return activity?.classIds?.[0] ? `Turma: ${activity.classIds[0]}` : '';
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
            >
              {existingBlock ? (
                <div className="space-y-1">
                  <div className="font-medium text-foreground truncate">
                    {getActivityTitle(existingBlock.postId)}
                  </div>
                  {getActivityClass(existingBlock.postId) && (
                    <div className="text-xs text-muted-foreground truncate">
                      {getActivityClass(existingBlock.postId)}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {existingBlock.type}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveBlock(existingBlock.id);
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
      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium min-w-[200px] text-center">
            {format(currentWeek, "dd 'de' MMMM", { locale: ptBR })} - {format(addDays(currentWeek, 6), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters & Settings */}
        <div className="flex items-center gap-2">
          <Select value={selectedTurma} onValueChange={setSelectedTurma}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {/* Add dynamic turmas here */}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Switch
              id="auto-suggestions"
              checked={preferences.autoSuggestionsEnabled}
              onCheckedChange={(checked) => updatePreferences({ autoSuggestionsEnabled: checked })}
            />
            <Label htmlFor="auto-suggestions" className="text-sm">
              Auto-sugestões
            </Label>
          </div>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((dateInfo, index) => (
          <Card
            key={dateInfo.dateStr}
            className={cn(
              "glass-card",
              dateInfo.isToday && "border-primary/50 bg-primary/5"
            )}
          >
            <CardHeader className="pb-2 px-3 py-2">
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

      {/* Activity Source Panel */}
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" />
            Atividades Disponíveis
            <Badge variant="secondary" className="ml-auto">
              {activities.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {activities.slice(0, 6).map(activity => (
              <div
                key={activity.id}
                className="p-2 glass-card rounded-lg border border-border/30 cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const tomorrowStr = tomorrow.toISOString().split('T')[0];
                  
                  const suggestions = suggestTimeSlots(tomorrowStr, 60);
                  if (suggestions.length > 0) {
                    addBlock({
                      postId: activity.id,
                      date: tomorrowStr,
                      startTime: suggestions[0].startTime,
                      endTime: suggestions[0].endTime,
                      turmaId: activity.classId || activity.classIds?.[0],
                      type: 'study'
                    });
                    
                    toast({
                      title: 'Atividade agendada',
                      description: `"${activity.title}" foi agendada para amanhã`
                    });
                  }
                }}
              >
                <div className="text-xs font-medium text-foreground truncate">
                  {activity.title}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {activity.classIds?.[0] ? `Turma: ${activity.classIds[0]}` : ''}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {activity.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}