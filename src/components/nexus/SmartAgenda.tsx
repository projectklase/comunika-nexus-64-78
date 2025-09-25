import { useState } from 'react';
import { Calendar, Clock, Plus, ChevronRight, MoreHorizontal } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNexus } from '@/hooks/useNexus';
import { useSmartAgenda } from '@/hooks/useSmartAgenda';
import { cn } from '@/lib/utils';

export function SmartAgenda() {
  const { activities, getActivityUrgency } = useNexus();
  const { 
    suggestStudyBlocks, 
    scheduleStudyBlock, 
    postponeStudyBlock, 
    getTodayBlocks, 
    getNextBlock 
  } = useSmartAgenda();
  
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');

  const todayBlocks = getTodayBlocks();
  const nextBlock = getNextBlock();

  const handleScheduleBlock = (activityId: string) => {
    const suggestions = suggestStudyBlocks(activityId);
    if (suggestions.length > 0) {
      const firstSuggestion = suggestions[0];
      scheduleStudyBlock(activityId, firstSuggestion.startTime, firstSuggestion.duration);
    }
  };

  const getBlockStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'in-progress': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'completed': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'skipped': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Next Block Alert */}
      {nextBlock && (
        <Card className="glass-card border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  Próximo bloco de estudo
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(parseISO(nextBlock.startTime), "HH:mm", { locale: ptBR })} - {nextBlock.duration}min
                </div>
              </div>
              <Button size="sm" variant="outline">
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Blocks */}
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Hoje
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {todayBlocks.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Nenhum bloco agendado para hoje
            </div>
          ) : (
            todayBlocks.map(block => {
              const activity = activities.find(a => a.id === block.activityId);
              return (
                <div 
                  key={block.id}
                  className="flex items-center gap-3 p-3 glass-card rounded-lg"
                >
                  <div className="text-sm font-mono text-muted-foreground">
                    {format(parseISO(block.startTime), "HH:mm")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {activity?.title || 'Atividade'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {block.duration} minutos
                    </div>
                  </div>
                  <Badge className={cn("text-xs", getBlockStatusColor(block.status))}>
                    {block.status === 'scheduled' && 'Agendado'}
                    {block.status === 'in-progress' && 'Em progreso'}
                    {block.status === 'completed' && 'Concluído'}
                    {block.status === 'skipped' && 'Pulado'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => postponeStudyBlock(block.id)}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Suggestions */}
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Sugestões de Estudo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activities.slice(0, 3).map(activity => {
            const urgency = getActivityUrgency(activity.id);
            const suggestions = suggestStudyBlocks(activity.id);
            
            return (
              <div 
                key={activity.id}
                className={cn(
                  "p-3 glass-card rounded-lg border transition-colors hover:bg-muted/20",
                  urgency.level === 'critical' && "border-red-500/30",
                  urgency.level === 'high' && "border-orange-500/30",
                  urgency.level === 'medium' && "border-yellow-500/30"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {activity.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {urgency.message}
                    </div>
                  </div>
                  <Badge 
                    variant={urgency.level === 'critical' ? 'destructive' : 'secondary'}
                    className="ml-2 text-xs"
                  >
                    {urgency.level}
                  </Badge>
                </div>

                {suggestions.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                      Próximos slots sugeridos:
                    </div>
                    {suggestions.slice(0, 2).map((suggestion, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="text-muted-foreground">
                          {format(suggestion.startTime, "dd/MM HH:mm", { locale: ptBR })} - {suggestion.duration}min
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleScheduleBlock(activity.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Agendar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {suggestions.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    Nenhum slot disponível encontrado
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-auto py-4 glass-card">
          <div className="text-center">
            <Plus className="h-5 w-5 mx-auto mb-1" />
            <div className="text-sm">Bloco Manual</div>
          </div>
        </Button>
        <Button variant="outline" className="h-auto py-4 glass-card min-w-0">
          <div className="text-center min-w-0">
            <Calendar className="h-5 w-5 mx-auto mb-1 flex-shrink-0" />
            <div className="text-sm truncate">
              <span className="sm:hidden">Calendário</span>
              <span className="hidden sm:inline">Ver Calendário</span>
            </div>
          </div>
        </Button>
      </div>
    </div>
  );
}