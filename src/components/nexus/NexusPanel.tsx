import { useState } from 'react';
import { ArrowLeft, Play, Target, Calendar, Clock, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNexus } from '@/hooks/useNexus';
import { useSmartAgenda } from '@/hooks/useSmartAgenda';
import { ActivityTrail } from './ActivityTrail';
import { FocusMode } from './FocusMode';
import { SmartAgenda } from './SmartAgenda';
import { cn } from '@/lib/utils';

interface NexusPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NexusPanel({ isOpen, onClose }: NexusPanelProps) {
  const { getNexusStatus, getActivityUrgency, activities } = useNexus();
  const { suggestStudyBlocks, scheduleStudyBlock } = useSmartAgenda();
  const [activeView, setActiveView] = useState<'overview' | 'trail' | 'focus' | 'agenda'>('overview');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');

  const status = getNexusStatus();
  const mostUrgent = status.mostUrgentActivity;

  const handleStartFocus = (activityId: string, stepId?: string) => {
    setSelectedActivityId(activityId);
    setActiveView('focus');
  };

  const handleViewTrail = (activityId: string) => {
    setSelectedActivityId(activityId);
    setActiveView('trail');
  };

  const handleScheduleBlock = (activityId: string) => {
    const suggestions = suggestStudyBlocks(activityId);
    if (suggestions.length > 0) {
      const firstSuggestion = suggestions[0];
      scheduleStudyBlock(activityId, firstSuggestion.startTime, firstSuggestion.duration);
    }
    setActiveView('agenda');
  };

  const handleBack = () => {
    setActiveView('overview');
    setSelectedActivityId('');
  };

  const renderHeader = () => (
    <div className="relative p-4 border-b border-border/30 bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        {activeView !== 'overview' ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2 text-primary hover:text-primary/80 p-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Voltar</span>
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary shadow-lg animate-glow-pulse" />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent font-bold text-xl">
              NEXUS
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="glass-card hover:glass-hover h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Status Summary */}
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            Status NEXUS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 glass-card rounded-lg">
              <div className="text-2xl font-bold text-primary">{status.todayCount}</div>
              <div className="text-xs text-muted-foreground">Hoje</div>
            </div>
            <div className="text-center p-3 glass-card rounded-lg">
              <div className="text-2xl font-bold text-secondary">{status.weekCount}</div>
              <div className="text-xs text-muted-foreground">Esta semana</div>
            </div>
          </div>
          
          {status.hasActiveFocus && (
            <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
              <div className="text-sm font-medium text-primary flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Sessão de foco ativa
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Priority Activity */}
      {mostUrgent && (
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="font-medium text-foreground mb-1 text-sm">
                {mostUrgent.activity.title}
              </div>
              <Badge 
                variant={mostUrgent.urgency.level === 'critical' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {mostUrgent.urgency.message}
              </Badge>
            </div>

            {status.nextStep && (
              <div className="p-2 bg-muted/20 rounded-lg">
                <div className="text-xs font-medium text-foreground">Próximo passo:</div>
                <div className="text-xs text-muted-foreground">{status.nextStep.title}</div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <Button 
                size="sm"
                onClick={() => handleStartFocus(mostUrgent.activity.id, status.nextStep?.id)}
                className="h-9 bg-gradient-primary hover:bg-gradient-primary/90 text-primary-foreground text-xs font-medium shadow-glow transition-all duration-200"
              >
                <Play className="h-3 w-3 mr-1" />
                <span className="truncate">Foco</span>
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleViewTrail(mostUrgent.activity.id)}
                className="h-9 glass-card hover:bg-muted/20 text-xs transition-all duration-200"
              >
                <Target className="h-3 w-3 mr-1" />
                <span className="truncate">Trilha</span>
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleScheduleBlock(mostUrgent.activity.id)}
                className="h-9 glass-card hover:bg-muted/20 text-xs transition-all duration-200"
              >
                <Calendar className="h-3 w-3 mr-1" />
                <span className="truncate">Agenda</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Access */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          className="h-16 glass-card hover:glass-hover border-border/50 hover:border-primary/30 group transition-all duration-300"
          onClick={() => setActiveView('agenda')}
        >
          <div className="text-center space-y-1">
            <Calendar className="h-5 w-5 mx-auto text-muted-foreground group-hover:text-primary transition-colors duration-200" />
            <div className="text-xs font-medium group-hover:text-foreground transition-colors duration-200">Agenda</div>
          </div>
        </Button>
        <Button 
          variant="outline" 
          className="h-16 glass-card hover:glass-hover border-border/50 hover:border-secondary/30 group transition-all duration-300"
          onClick={() => setActiveView('focus')}
        >
          <div className="text-center space-y-1">
            <Clock className="h-5 w-5 mx-auto text-muted-foreground group-hover:text-secondary transition-colors duration-200" />
            <div className="text-xs font-medium group-hover:text-foreground transition-colors duration-200">Foco</div>
          </div>
        </Button>
      </div>

      {/* Activities List */}
      {activities.length > 0 && (
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Atividades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activities.slice(0, 4).map(activity => {
              const urgency = getActivityUrgency(activity.id);
              return (
                <div 
                  key={activity.id}
                  className="flex items-center justify-between p-2 glass-card rounded-lg hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => handleViewTrail(activity.id)}
                >
                  <div className="min-w-0 flex-1 mr-2">
                    <div className="text-xs font-medium text-foreground truncate">
                      {activity.title}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {urgency.message}
                    </div>
                  </div>
                  <Badge 
                    variant={urgency.level === 'critical' ? 'destructive' : 'secondary'}
                    className="text-xs flex-shrink-0"
                  >
                    {urgency.level}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[400px] max-w-md glass-card border-l border-border/50 p-0 flex flex-col"
      >
        {renderHeader()}
        
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Content */}
            {activeView === 'overview' && renderOverview()}
            {activeView === 'trail' && selectedActivityId && (
              <ActivityTrail activityId={selectedActivityId} />
            )}
            {activeView === 'focus' && (
              <FocusMode activityId={selectedActivityId} onExit={handleBack} />
            )}
            {activeView === 'agenda' && (
              <SmartAgenda />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}