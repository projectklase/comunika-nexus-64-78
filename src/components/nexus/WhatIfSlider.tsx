import { useState, useMemo } from 'react';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RotateCcw, Calendar, AlertTriangle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { usePosts } from '@/hooks/usePosts';
import { useActivityPriority } from '@/hooks/useActivityPriority';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface WhatIfSliderProps {
  className?: string;
}

export function WhatIfSlider({ className }: WhatIfSliderProps) {
  const [daysOffset, setDaysOffset] = useState([0]);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  
  const allPosts = usePosts({ status: 'PUBLISHED' });
  const { getTopPriorityActivities, getActivityPriority } = useActivityPriority();

  // Get activities with due dates
  const activities = useMemo(() => {
    return allPosts.filter(post => 
      ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type) && 
      post.dueAt
    );
  }, [allPosts]);

  // Simulate what-if scenario
  const simulatedActivities = useMemo(() => {
    if (daysOffset[0] === 0) return activities;
    
    return activities.map(activity => ({
      ...activity,
      dueAt: format(addDays(new Date(activity.dueAt!), daysOffset[0]), 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''),
      isSimulated: true
    }));
  }, [activities, daysOffset]);

  // Get priority changes
  const priorityChanges = useMemo(() => {
    if (daysOffset[0] === 0) return [];
    
    const originalPriorities = getTopPriorityActivities(5);
    
    // Simulate priorities with new dates
    const changes = originalPriorities.map(originalPriority => {
      const activity = activities.find(a => a.id === originalPriority.activityId);
      if (!activity) return null;
      
      const simulatedActivity = simulatedActivities.find(a => a.id === activity.id);
      if (!simulatedActivity) return null;
      
      // Calculate new priority
      const newDueDate = new Date(simulatedActivity.dueAt!);
      const now = new Date();
      const newDaysUntilDue = Math.ceil((newDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Simple priority calculation (would use real getActivityPriority in production)
      const newRisk = newDaysUntilDue <= 1 ? 'HIGH' : newDaysUntilDue <= 3 ? 'MEDIUM' : 'LOW';
      const newScore = Math.max(0, Math.min(1, (7 - newDaysUntilDue) / 7));
      
      return {
        activityId: activity.id,
        title: activity.title,
        originalRisk: originalPriority.risk,
        newRisk: newRisk as 'LOW' | 'MEDIUM' | 'HIGH',
        originalScore: originalPriority.score,
        newScore,
        originalDaysUntilDue: originalPriority.daysUntilDue,
        newDaysUntilDue,
        hasConflict: newDaysUntilDue < 0
      };
    }).filter(Boolean);
    
    return changes;
  }, [daysOffset, activities, simulatedActivities, getTopPriorityActivities]);

  const handleReset = () => {
    setDaysOffset([0]);
    setSelectedActivityId(null);
    toast({
      title: 'Realidade restaurada',
      description: 'Simulação resetada para os prazos originais'
    });
  };

  const handleApplyToActivity = (activityId: string) => {
    if (daysOffset[0] === 0) return;
    
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;
    
    // In a real app, this would update the post's dueAt
    toast({
      title: 'Prazo atualizado',
      description: `"${activity.title}" teve o prazo adiado em ${daysOffset[0]} dia(s)`,
    });
    
    setSelectedActivityId(null);
    setDaysOffset([0]);
  };

  const getRiskColor = (risk: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (risk) {
      case 'HIGH':
        return 'text-red-500 bg-red-500/10';
      case 'MEDIUM':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'LOW':
        return 'text-green-500 bg-green-500/10';
    }
  };

  const getRiskChange = (originalRisk: string, newRisk: string) => {
    const riskValues = { LOW: 1, MEDIUM: 2, HIGH: 3 };
    const original = riskValues[originalRisk as keyof typeof riskValues];
    const current = riskValues[newRisk as keyof typeof riskValues];
    
    if (current > original) return 'increased';
    if (current < original) return 'decreased';
    return 'same';
  };

  return (
    <Card className={cn("glass-card border-border/50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Simulador What-If
          {daysOffset[0] > 0 && (
            <Badge variant="outline" className="text-xs ml-auto">
              +{daysOffset[0]} dia(s)
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Adiar prazos em:</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {daysOffset[0] === 0 ? 'Realidade' : `+${daysOffset[0]} dia(s)`}
              </span>
              {daysOffset[0] > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-6 w-6 p-0"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          <Slider
            value={daysOffset}
            onValueChange={setDaysOffset}
            max={7}
            min={0}
            step={1}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Hoje</span>
            <span>+3 dias</span>
            <span>+7 dias</span>
          </div>
        </div>

        {/* Impact Summary */}
        {daysOffset[0] > 0 && priorityChanges.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-medium">Impacto na Priorização</span>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {priorityChanges.map((change) => {
                if (!change) return null;
                
                const riskChange = getRiskChange(change.originalRisk, change.newRisk);
                
                return (
                  <div
                    key={change.activityId}
                    className={cn(
                      "p-2 rounded-lg border transition-all duration-200 cursor-pointer hover:bg-muted/20",
                      selectedActivityId === change.activityId && "ring-2 ring-primary/50"
                    )}
                    onClick={() => setSelectedActivityId(
                      selectedActivityId === change.activityId ? null : change.activityId
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {change.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {change.originalDaysUntilDue} → {change.newDaysUntilDue} dias restantes
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {/* Original Risk */}
                        <Badge className={cn("text-xs", getRiskColor(change.originalRisk.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH'))}>
                          {change.originalRisk}
                        </Badge>
                        
                        {/* Arrow */}
                        <div className={cn(
                          "text-xs",
                          riskChange === 'increased' ? "text-red-500" : 
                          riskChange === 'decreased' ? "text-green-500" : 
                          "text-muted-foreground"
                        )}>
                          {riskChange === 'increased' ? '↗' : 
                           riskChange === 'decreased' ? '↘' : '→'}
                        </div>
                        
                        {/* New Risk */}
                        <Badge className={cn("text-xs", getRiskColor(change.newRisk.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH'))}>
                          {change.newRisk}
                        </Badge>
                      </div>
                    </div>
                    
                    {change.hasConflict && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Prazo no passado!</span>
                      </div>
                    )}
                    
                    {selectedActivityId === change.activityId && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyToActivity(change.activityId);
                          }}
                          disabled={change.hasConflict}
                          className="w-full"
                        >
                          Aplicar Mudança
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
              Clique em uma atividade para aplicar a mudança de prazo
            </div>
          </div>
        )}

        {/* No Changes State */}
        {daysOffset[0] === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Mova o slider para simular o impacto de adiar prazos
          </div>
        )}
      </CardContent>
    </Card>
  );
}