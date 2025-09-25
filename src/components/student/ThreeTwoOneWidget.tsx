import { useState, useEffect, useRef } from 'react';
import { parseISO, isToday, format, isAfter, isBefore, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Play, Pause, RotateCcw, CheckCircle2, Circle, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { usePosts } from '@/hooks/usePosts';
import { useAuth } from '@/contexts/AuthContext';
import { Post } from '@/types/post';
import { cn } from '@/lib/utils';

const MOOD_EMOJIS = ['😄', '🙂', '😐', '😕', '😴'];
const MOOD_LABELS = ['Super bem!', 'Bem', 'Normal', 'Meio down', 'Cansado'];

interface MoodState {
  level: number;
  date: string;
}

interface IntentionState {
  text: string;
  date: string;
}

interface CompletedTask {
  id: string;
  date: string;
}

export function ThreeTwoOneWidget() {
  const { user } = useAuth();
  const [mood, setMood] = useState<number>(2); // Default: 😐
  const [intention, setIntention] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(120); // 2 minutes
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout>();

  const allPosts = usePosts({ status: 'PUBLISHED' });

  // Helper functions
  const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');
  const getUserKey = (type: string) => `communika.${type}.${user?.id}.${getTodayKey()}`;

  // Load persisted data
  useEffect(() => {
    if (!user) return;

    // Load mood
    const moodKey = getUserKey('mood');
    const savedMood = localStorage.getItem(moodKey);
    if (savedMood) {
      const moodData: MoodState = JSON.parse(savedMood);
      if (moodData.date === getTodayKey()) {
        setMood(moodData.level);
      }
    }

    // Load intention
    const intentionKey = getUserKey('intent');
    const savedIntention = localStorage.getItem(intentionKey);
    if (savedIntention) {
      const intentionData: IntentionState = JSON.parse(savedIntention);
      if (intentionData.date === getTodayKey()) {
        setIntention(intentionData.text);
      }
    }

    // Load completed tasks
    const completedKey = getUserKey('completed');
    const savedCompleted = localStorage.getItem(completedKey);
    if (savedCompleted) {
      const completedData: CompletedTask[] = JSON.parse(savedCompleted);
      const todayCompleted = completedData
        .filter(task => task.date === getTodayKey())
        .map(task => task.id);
      setCompletedTasks(new Set(todayCompleted));
    }
  }, [user]);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning && timerSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            // Timer completed
            const microSessionsKey = `communika.microSessions.${user?.id}`;
            const current = parseInt(localStorage.getItem(microSessionsKey) || '0');
            localStorage.setItem(microSessionsKey, (current + 1).toString());
            
            toast({
              title: 'Boa! +1 microfoco ✨',
              description: 'Você completou um bloco de 2 minutos!'
            });
            return 120; // Reset to 2 minutes
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTimerRunning, timerSeconds, user]);

  // Get today's important tasks
  const todayTasks = allPosts
    .filter(post => {
      if (!['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) return false;
      if (!post.dueAt) return false;
      
      const dueDate = parseISO(post.dueAt);
      const now = new Date();
      const next48h = addHours(now, 48);
      
      return isAfter(dueDate, now) && isBefore(dueDate, next48h);
    })
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
    .slice(0, 3);

  const handleMoodClick = () => {
    const newMood = (mood + 1) % MOOD_EMOJIS.length;
    setMood(newMood);
    
    const moodData: MoodState = {
      level: newMood,
      date: getTodayKey()
    };
    localStorage.setItem(getUserKey('mood'), JSON.stringify(moodData));
  };

  const handleIntentionChange = (value: string) => {
    if (value.length > 40) return;
    setIntention(value);
    
    const intentionData: IntentionState = {
      text: value,
      date: getTodayKey()
    };
    localStorage.setItem(getUserKey('intent'), JSON.stringify(intentionData));
  };

  const handleTaskComplete = (taskId: string) => {
    const newCompleted = new Set(completedTasks);
    if (completedTasks.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
    }
    setCompletedTasks(newCompleted);

    // Save to localStorage
    const completedData: CompletedTask[] = Array.from(newCompleted).map(id => ({
      id,
      date: getTodayKey()
    }));
    localStorage.setItem(getUserKey('completed'), JSON.stringify(completedData));
    
    toast({
      title: completedTasks.has(taskId) ? 'Desmarcado' : 'Marcado como feito! ✓',
      description: completedTasks.has(taskId) ? 'Tarefa desmarcada' : 'Continue assim!'
    });
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(120);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ATIVIDADE': return 'bg-green-100 text-green-700 border-green-200';
      case 'TRABALHO': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'PROVA': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-3">
      {/* Mood Orb */}
      <Card className="glass-card border-border/50 p-4">
        <div className="flex items-center justify-center">
          <Button
            variant="ghost"
            onClick={handleMoodClick}
            className="h-12 w-12 rounded-full p-0 text-2xl hover:scale-110 transition-transform duration-200"
            aria-label={`Humor atual: ${MOOD_LABELS[mood]}. Clique para alterar`}
            title={`oi! como vc tá hoje? (${MOOD_LABELS[mood]})`}
          >
            {MOOD_EMOJIS[mood]}
          </Button>
        </div>
      </Card>

      {/* 3 de hoje */}
      <Card className="glass-card border-border/50">
        <CardContent className="p-4 space-y-3">
          <h3 className="font-medium text-sm text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">3</span>
            de hoje
          </h3>
          
          {todayTasks.length === 0 ? (
            <div className="text-center py-3">
              <p className="text-xs text-muted-foreground mb-2">
                Nada crítico hoje ✨
              </p>
              <p className="text-xs text-muted-foreground">
                que tal revisar algo rápido?
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTaskComplete(task.id)}
                    className="h-5 w-5 p-0 shrink-0"
                    aria-label={`Marcar "${task.title}" como ${completedTasks.has(task.id) ? 'não ' : ''}feito`}
                  >
                    {completedTasks.has(task.id) ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-xs font-medium truncate",
                      completedTasks.has(task.id) && "line-through text-muted-foreground"
                    )}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="outline" className={cn("text-xs py-0 px-1", getTypeColor(task.type))}>
                        {task.type}
                      </Badge>
                      {task.dueAt && (
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(task.dueAt), 'dd/MM')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    aria-label={`Abrir detalhes de "${task.title}"`}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2 min de foco */}
      <Card className="glass-card border-border/50">
        <CardContent className="p-4 text-center space-y-3">
          <h3 className="font-medium text-sm text-foreground flex items-center justify-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">2</span>
            min de foco
          </h3>
          
          <div className="relative">
            <Button
              onClick={toggleTimer}
              className={cn(
                "h-16 w-16 rounded-full text-lg font-mono relative overflow-hidden transition-all duration-300",
                isTimerRunning ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"
              )}
              aria-label={isTimerRunning ? 'Pausar timer' : 'Iniciar timer de 2 minutos'}
            >
              {isTimerRunning ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" />
              )}
              
              {/* Progress ring */}
              <svg className="absolute inset-0 h-16 w-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeOpacity="0.2"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - (120 - timerSeconds) / 120)}`}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-mono text-muted-foreground">
              {formatTime(timerSeconds)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetTimer}
              className="h-6 w-6 p-0"
              aria-label="Resetar timer"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 1 intenção */}
      <Card className="glass-card border-border/50">
        <CardContent className="p-4 space-y-3">
          <h3 className="font-medium text-sm text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">1</span>
            intenção
          </h3>
          
          <Input
            placeholder="minha intenção do dia…"
            value={intention}
            onChange={(e) => handleIntentionChange(e.target.value)}
            className="text-xs border-border/50 focus:border-primary/50"
            maxLength={40}
            aria-label="Definir intenção do dia"
          />
          
          {intention && (
            <p className="text-xs text-muted-foreground italic">
              "{intention}"
            </p>
          )}
          
          <div className="text-right">
            <span className="text-xs text-muted-foreground">
              {intention.length}/40
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}