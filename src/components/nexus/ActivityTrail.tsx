import { useState } from 'react';
import { Check, Edit, GripVertical, Plus, Trash2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNexus } from '@/hooks/useNexus';
import { cn } from '@/lib/utils';

interface ActivityTrailProps {
  activityId: string;
}

export function ActivityTrail({ activityId }: ActivityTrailProps) {
  const { 
    trails, 
    updateStep, 
    completeStep, 
    reorderSteps, 
    getTrailProgress, 
    startFocusSession,
    preferences,
    activities
  } = useNexus();

  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editEstimate, setEditEstimate] = useState(0);

  const trail = trails[activityId];
  const activity = activities.find(a => a.id === activityId);
  const progress = getTrailProgress(activityId);

  if (!trail || !activity) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">Trilha não encontrada</div>
      </div>
    );
  }

  const handleEditStep = (stepId: string, title: string, estimatedMinutes: number) => {
    setEditingStep(stepId);
    setEditTitle(title);
    setEditEstimate(estimatedMinutes);
  };

  const handleSaveEdit = (stepIndex: number) => {
    updateStep(activityId, stepIndex, {
      title: editTitle,
      estimatedMinutes: editEstimate
    });
    setEditingStep(null);
  };

  const handleCancelEdit = () => {
    setEditingStep(null);
    setEditTitle('');
    setEditEstimate(0);
  };

  const handleStartFocus = (stepId: string) => {
    const step = trail.steps.find(s => s.id === stepId);
    if (step) {
      startFocusSession(activityId, stepId, preferences.preferredFocusDuration);
    }
  };

  const getStepStatus = (stepIndex: number) => {
    const step = trail.steps[stepIndex];
    const isCurrent = stepIndex === trail.currentStepIndex;
    const isCompleted = step.completed;
    const isPast = stepIndex < trail.currentStepIndex;

    return { isCurrent, isCompleted, isPast };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{activity.title}</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={progress} className="h-2" />
            </div>
            <Badge variant="outline" className="text-sm">
              {progress}%
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Trail Steps */}
      <div className="space-y-3">
        {trail.steps.map((step, index) => {
          const { isCurrent, isCompleted, isPast } = getStepStatus(index);
          const isEditing = editingStep === step.id;

          return (
            <Card 
              key={step.id}
              className={cn(
                "glass-card border transition-all duration-200",
                isCurrent && "border-primary/50 bg-primary/5",
                isCompleted && "border-green-500/30 bg-green-500/5",
                isPast && !isCompleted && "border-muted opacity-60"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Step Indicator */}
                  <div 
                    className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      isCompleted && "bg-green-500 text-white",
                      isCurrent && !isCompleted && "bg-primary text-primary-foreground",
                      !isCurrent && !isCompleted && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="text-sm"
                          placeholder="Título do passo"
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editEstimate}
                            onChange={(e) => setEditEstimate(parseInt(e.target.value) || 0)}
                            className="text-sm w-20"
                            min="1"
                            max="180"
                          />
                          <span className="text-xs text-muted-foreground">min</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveEdit(index)}>
                            Salvar
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={cn(
                            "font-medium text-sm",
                            isCompleted && "line-through text-muted-foreground",
                            isCurrent && "text-primary"
                          )}>
                            {step.title}
                          </h4>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {step.estimatedMinutes}min
                            </Badge>
                          </div>
                        </div>

                        {step.description && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {step.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2">
                          {!isCompleted && isCurrent && (
                            <>
                              <Button 
                                size="sm"
                                onClick={() => completeStep(activityId, index)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Concluir
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleStartFocus(step.id)}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Focar
                              </Button>
                            </>
                          )}
                          
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleEditStep(step.id, step.title, step.estimatedMinutes)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Progress Summary */}
      <Card className="glass-card border-border/50">
        <CardContent className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {trail.steps.filter(s => s.completed).length} / {trail.steps.length}
            </div>
            <div className="text-sm text-muted-foreground">
              passos concluídos
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Tempo estimado restante: {trail.steps.filter(s => !s.completed).reduce((total, s) => total + s.estimatedMinutes, 0)} min
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}