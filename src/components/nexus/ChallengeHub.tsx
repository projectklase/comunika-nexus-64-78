import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckCircle, Trophy, Flame, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock de dados por enquanto (será conectado ao Supabase na Fase 2)
const mockChallenges = [
  { 
    id: 1, 
    title: 'Leitor Ativo', 
    description: 'Leia 1 post novo no Feed hoje', 
    reward: 20,
    progress: 0,
    target: 1,
    icon: 'BookOpen',
    type: 'DAILY' as const
  },
  { 
    id: 2, 
    title: 'Entrega em Dia', 
    description: 'Entregue 1 atividade dentro do prazo hoje', 
    reward: 50,
    progress: 0,
    target: 1,
    icon: 'CheckCircle',
    type: 'DAILY' as const
  },
  { 
    id: 3, 
    title: 'Fogo na Leitura', 
    description: 'Leia 5 posts esta semana', 
    reward: 100,
    progress: 2,
    target: 5,
    icon: 'Flame',
    type: 'WEEKLY' as const
  },
  { 
    id: 4, 
    title: 'Semana Perfeita', 
    description: 'Complete todas as atividades da semana', 
    reward: 200,
    progress: 3,
    target: 7,
    icon: 'Trophy',
    type: 'WEEKLY' as const
  },
];

const iconMap = {
  BookOpen,
  CheckCircle,
  Trophy,
  Flame,
};

export function ChallengeHub() {
  const dailyChallenges = mockChallenges.filter(c => c.type === 'DAILY');
  const weeklyChallenges = mockChallenges.filter(c => c.type === 'WEEKLY');

  const renderChallenge = (challenge: typeof mockChallenges[0]) => {
    const Icon = iconMap[challenge.icon as keyof typeof iconMap];
    const progressPercent = (challenge.progress / challenge.target) * 100;
    const isComplete = challenge.progress >= challenge.target;

    return (
      <Card 
        key={challenge.id} 
        className={cn(
          "glass-card border-border/50 transition-all duration-300 hover:border-primary/30",
          isComplete && "bg-primary/5 border-primary/50"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              isComplete ? "bg-primary/20" : "bg-muted/50"
            )}>
              <Icon className={cn(
                "h-4 w-4",
                isComplete ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <CardTitle className="text-sm font-medium">{challenge.title}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-yellow-500" />
            <span className="text-xs font-bold text-yellow-500">+{challenge.reward}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">{challenge.description}</p>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progresso</span>
              <span className={cn(
                "font-medium",
                isComplete ? "text-primary" : "text-foreground"
              )}>
                {challenge.progress}/{challenge.target}
              </span>
            </div>
            <Progress 
              value={progressPercent} 
              className={cn(
                "h-2",
                isComplete && "bg-primary/20"
              )}
            />
          </div>

          {isComplete && (
            <Badge variant="default" className="w-full justify-center text-xs bg-primary/20 text-primary border-primary/30">
              ✓ Completo! Aguardando Koins
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Desafios & Recompensas
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Complete desafios e ganhe Koins para trocar na loja!
        </p>
      </div>

      {/* Daily Challenges */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-primary rounded-full" />
          <h4 className="text-sm font-medium text-foreground">Desafios Diários</h4>
          <Badge variant="outline" className="text-xs">Renova em 8h</Badge>
        </div>
        <div className="space-y-2">
          {dailyChallenges.map(renderChallenge)}
        </div>
      </div>

      {/* Weekly Challenges */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-secondary rounded-full" />
          <h4 className="text-sm font-medium text-foreground">Desafios Semanais</h4>
          <Badge variant="outline" className="text-xs">Renova Segunda</Badge>
        </div>
        <div className="space-y-2">
          {weeklyChallenges.map(renderChallenge)}
        </div>
      </div>

      {/* Info Footer */}
      <Card className="glass-card border-primary/20 bg-primary/5">
        <CardContent className="p-3">
          <p className="text-xs text-center text-muted-foreground">
            💡 <span className="font-medium">Dica:</span> Os Koins são creditados automaticamente quando você completa um desafio!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
