import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Square, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNexus } from '@/hooks/useNexus';
import { cn } from '@/lib/utils';

interface FocusModeProps {
  activityId?: string;
  onExit?: () => void;
}

export function FocusMode({ activityId, onExit }: FocusModeProps) {
  const { 
    activeFocusSession,
    trails,
    activities,
    preferences,
    startFocusSession,
    pauseFocusSession,
    resumeFocusSession,
    completeFocusSession,
    abandonFocusSession,
    completeStep,
    getNextStep
  } = useNexus();

  const [timeLeft, setTimeLeft] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activity = activityId ? activities.find(a => a.id === activityId) : null;
  const trail = activityId ? trails[activityId] : null;
  const currentStep = activityId ? getNextStep(activityId) : null;

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && activeFocusSession) {
        e.preventDefault();
        if (activeFocusSession.status === 'active') {
          pauseFocusSession();
        } else if (activeFocusSession.status === 'paused') {
          resumeFocusSession();
        }
      } else if (e.code === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else if (onExit) {
          onExit();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeFocusSession, isFullscreen, onExit]);

  // Timer effect
  useEffect(() => {
    if (!activeFocusSession || activeFocusSession.status !== 'active') {
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const startTime = new Date(activeFocusSession.startedAt);
      
      // Calculate total pause time
      const totalPauseTime = activeFocusSession.pauseReasons.reduce((total, pause) => {
        const pauseStart = new Date(pause.pausedAt);
        const pauseEnd = pause.resumedAt ? new Date(pause.resumedAt) : now;
        return total + (pauseEnd.getTime() - pauseStart.getTime());
      }, 0);

      const elapsedTime = now.getTime() - startTime.getTime() - totalPauseTime;
      const totalDuration = activeFocusSession.duration * 60 * 1000;
      const remaining = Math.max(0, totalDuration - elapsedTime);

      setTimeLeft(Math.ceil(remaining / 1000));

      if (remaining <= 0) {
        completeFocusSession();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeFocusSession, completeFocusSession]);

  const handleStartFocus = (duration: 25 | 40 | 60) => {
    if (activityId) {
      startFocusSession(activityId, currentStep?.id, duration);
    }
  };

  const handleCompleteStep = () => {
    if (activityId && trail && currentStep) {
      const stepIndex = trail.steps.findIndex(s => s.id === currentStep.id);
      if (stepIndex !== -1) {
        completeStep(activityId, stepIndex);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    if (!activeFocusSession) return 0;
    const totalSeconds = activeFocusSession.duration * 60;
    return ((totalSeconds - timeLeft) / totalSeconds) * 100;
  };

  // Fullscreen mode
  if (isFullscreen && activeFocusSession) {
    return (
      <div 
        className="fixed inset-0 z-50 bg-background flex items-center justify-center"
        style={{ 
          background: preferences.reducedMotion 
            ? 'hsl(var(--background))' 
            : 'radial-gradient(circle at center, hsl(var(--primary) / 0.1), hsl(var(--background)))'
        }}
      >
        <div className="text-center space-y-8 max-w-md w-full px-6">
          {/* Timer Display */}
          <div className="space-y-4">
            <div className="text-8xl font-mono font-bold text-primary tracking-wider">
              {formatTime(timeLeft)}
            </div>
            
            <Progress 
              value={getProgress()} 
              className="h-3 w-full"
            />
            
            <div className="text-muted-foreground">
              {activity?.title}
            </div>
            
            {currentStep && (
              <Badge variant="outline" className="px-3 py-1">
                {currentStep.title}
              </Badge>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              variant="outline"
              onClick={() => setIsFullscreen(false)}
              className="px-6"
            >
              <X className="h-5 w-5 mr-2" />
              Sair
            </Button>

            <Button
              size="lg"
              onClick={() => {
                if (activeFocusSession.status === 'active') {
                  pauseFocusSession();
                } else {
                  resumeFocusSession();
                }
              }}
              className="px-8"
            >
              {activeFocusSession.status === 'active' ? (
                <>
                  <Pause className="h-5 w-5 mr-2" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Retomar
                </>
              )}
            </Button>

            {currentStep && (
              <Button
                size="lg"
                variant="outline"
                onClick={handleCompleteStep}
                className="px-6 bg-green-600 hover:bg-green-700 text-white border-green-600"
              >
                <Check className="h-5 w-5 mr-2" />
                Concluir Passo
              </Button>
            )}
          </div>

          {/* Micro-break hint */}
          {preferences.enableMicroBreaks && activeFocusSession.status === 'paused' && (
            <div className="text-sm text-muted-foreground max-w-sm mx-auto">
              💡 Micro-pausa: Respire fundo, hidrate-se ou alongue-se rapidamente
            </div>
          )}

          {/* Keyboard shortcuts */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>ESPAÇO: Pausar/Retomar</div>
            <div>ESC: Sair do modo tela cheia</div>
          </div>
        </div>
      </div>
    );
  }

  // Panel mode
  return (
    <div className="space-y-4">
      {/* Session Setup */}
      {!activeFocusSession && (
        <Card className="glass-card border-border/50">
          <CardContent className="p-6 text-center space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Iniciar Sessão de Foco</h3>
              {activity && (
                <div className="text-sm text-muted-foreground mb-1">
                  {activity.title}
                </div>
              )}
              {currentStep && (
                <Badge variant="outline" className="text-xs">
                  {currentStep.title}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-md mx-auto">
              {[25, 40, 60].map(duration => (
                <Button
                  key={duration}
                  variant={duration === preferences.preferredFocusDuration ? 'default' : 'outline'}
                  onClick={() => handleStartFocus(duration as 25 | 40 | 60)}
                  className={cn(
                    "h-16 sm:h-20 flex flex-col items-center justify-center space-y-1 transition-all duration-300 group relative overflow-hidden w-full",
                    duration === preferences.preferredFocusDuration 
                      ? "bg-gradient-primary text-primary-foreground shadow-glow border-primary/50" 
                      : "glass-card hover:glass-hover border-border/50 hover:border-primary/30"
                  )}
                >
                  <div className="text-xl sm:text-2xl font-bold tracking-tight">{duration}</div>
                  <div className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">min</div>
                  {duration === preferences.preferredFocusDuration && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Session */}
      {activeFocusSession && (
        <Card className="glass-card border-border/50">
          <CardContent className="p-6 space-y-4">
            {/* Timer */}
            <div className="text-center space-y-2">
              <div className="text-4xl font-mono font-bold text-primary">
                {formatTime(timeLeft)}
              </div>
              <Progress value={getProgress()} className="h-2" />
            </div>

            {/* Activity Info */}
            <div className="text-center space-y-1">
              {activity && (
                <div className="text-sm font-medium">{activity.title}</div>
              )}
              {currentStep && (
                <Badge variant="outline" className="text-xs">
                  {currentStep.title}
                </Badge>
              )}
            </div>

            {/* Controls - Enhanced Grid Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsFullscreen(true)}
                className="w-full h-10 glass-card hover:glass-hover border-border/50 hover:border-accent/30 transition-all duration-200"
              >
                <span className="truncate">Tela Cheia</span>
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  if (activeFocusSession.status === 'active') {
                    pauseFocusSession();
                  } else {
                    resumeFocusSession();
                  }
                }}
                className={cn(
                  "w-full h-10 font-medium transition-all duration-200",
                  activeFocusSession.status === 'active'
                    ? "bg-amber-600 hover:bg-amber-700 text-white shadow-lg"
                    : "bg-gradient-primary hover:bg-gradient-primary/90 text-primary-foreground shadow-glow"
                )}
              >
                {activeFocusSession.status === 'active' ? (
                  <>
                    <Pause className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Retomar</span>
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={abandonFocusSession}
                className="w-full h-10 glass-card hover:glass-hover border-border/50 hover:border-destructive/30 hover:text-destructive transition-all duration-200"
              >
                <Square className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">Parar</span>
              </Button>
            </div>

            {/* Step Action */}
            {currentStep && (
              <div className="border-t border-border/30 pt-4">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleCompleteStep}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Concluir Passo: {currentStep.title}
                </Button>
              </div>
            )}

            {/* Status */}
            {activeFocusSession.status === 'paused' && preferences.enableMicroBreaks && (
              <div className="text-xs text-center text-muted-foreground p-2 bg-muted/20 rounded">
                💡 Aproveite para uma micro-pausa: respire, hidrate-se ou alongue-se
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}