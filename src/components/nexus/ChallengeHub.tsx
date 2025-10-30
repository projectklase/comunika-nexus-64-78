import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle, Trophy, Flame, Sparkles, Frown, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap = {
  BookOpen,
  CheckCircle,
  Trophy,
  Flame,
};

interface Challenge {
  challenge_id: string;
  student_challenge_id: string;
  title: string;
  description: string;
  koin_reward: number;
  challenge_type: string;
  action_target: string;
  action_count: number;
  current_progress: number;
  status: string;
  started_at: string;
  expires_at: string | null;
  icon_name: string;
  is_current_cycle?: boolean;
}

interface CompletedChallenge {
  id: string;
  completed_at: string;
  challenges: {
    title: string;
    koin_reward: number;
    icon_name: string;
  };
}

export function ChallengeHub() {
  const { user } = useAuth();
  const [showHistory, setShowHistory] = useState(false);

  const { data: challenges, isLoading } = useQuery({
    queryKey: ['student_challenges', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.rpc(
        'get_student_challenges_with_progress',
        { p_student_id: user.id }
      );
      if (error) throw error;
      return data as Challenge[];
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch a cada 30s
  });

  // QOL 2: Histórico de desafios completados (últimos 7 dias)
  const { data: completedChallenges } = useQuery({
    queryKey: ['completed_challenges_history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('student_challenges')
        .select(`
          id,
          completed_at,
          challenges(title, koin_reward, icon_name)
        `)
        .eq('student_id', user.id)
        .eq('status', 'COMPLETED')
        .gte('completed_at', sevenDaysAgo.toISOString())
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      return data as CompletedChallenge[];
    },
    enabled: !!user && showHistory
  });

  const dailyChallenges = challenges?.filter(c => c.challenge_type === 'DAILY') || [];
  const weeklyChallenges = challenges?.filter(c => c.challenge_type === 'WEEKLY') || [];

  const renderChallenge = (challenge: Challenge) => {
    const Icon = iconMap[challenge.icon_name as keyof typeof iconMap] || Sparkles;
    const progressPercent = (challenge.current_progress / challenge.action_count) * 100;
    const isComplete = challenge.status === 'COMPLETED';

    return (
      <Card 
        key={challenge.student_challenge_id}
        className={cn(
          "glass-card border-border/50 transition-all duration-300 hover:border-primary/30",
          isComplete && "bg-gradient-to-br from-green-500/10 via-primary/5 to-green-500/10 border-green-500/50 shadow-lg shadow-green-500/20"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              isComplete ? "bg-green-500/20 ring-2 ring-green-500/50" : "bg-muted/50"
            )}>
              {isComplete ? (
                <Trophy className="h-4 w-4 text-green-500" />
              ) : (
                <Icon className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <CardTitle className="text-sm font-medium">{challenge.title}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-yellow-500" />
            <span className="text-xs font-bold text-yellow-500">+{challenge.koin_reward}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">{challenge.description}</p>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progresso</span>
              <span className={cn(
                "font-medium",
                isComplete ? "text-green-500" : "text-foreground"
              )}>
                {challenge.current_progress}/{challenge.action_count}
              </span>
            </div>
            <Progress 
              value={progressPercent} 
              className={cn(
                "h-2",
                isComplete && "bg-green-500/20 [&>div]:bg-gradient-to-r [&>div]:from-green-500 [&>div]:to-green-400"
              )}
            />
          </div>

          {isComplete && (
            <Badge 
              variant="default" 
              className="w-full justify-center text-xs bg-green-500/20 text-green-500 border-green-500/30 font-medium"
            >
              ✓ Completado {challenge.challenge_type === 'DAILY' ? 'hoje' : 'esta semana'}! 🎉
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!challenges || challenges.length === 0) {
    return (
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="pt-6 flex flex-col items-center justify-center space-y-2">
          <Frown className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            Nenhum desafio ativo no momento
          </p>
          <p className="text-xs text-muted-foreground">
            Novos desafios serão atribuídos em breve!
          </p>
        </CardContent>
      </Card>
    );
  }

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
      {dailyChallenges.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-primary rounded-full" />
            <h4 className="text-sm font-medium text-foreground">Desafios Diários</h4>
            <Badge variant="outline" className="text-xs">Renovam diariamente</Badge>
          </div>
          <div className="space-y-2">
            {dailyChallenges.map(renderChallenge)}
          </div>
        </div>
      )}

      {/* Weekly Challenges */}
      {weeklyChallenges.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-secondary rounded-full" />
            <h4 className="text-sm font-medium text-foreground">Desafios Semanais</h4>
            <Badge variant="outline" className="text-xs">Renovam segunda-feira</Badge>
          </div>
          <div className="space-y-2">
            {weeklyChallenges.map(renderChallenge)}
          </div>
        </div>
      )}

      {/* QOL 2: Histórico de desafios completados */}
      <Collapsible open={showHistory} onOpenChange={setShowHistory} className="space-y-2">
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-between hover:bg-muted/50"
          >
            <span className="text-sm font-medium">Histórico (últimos 7 dias)</span>
            {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2">
          {completedChallenges && completedChallenges.length > 0 ? (
            completedChallenges.map((c) => (
              <div 
                key={c.id} 
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  <span className="text-xs font-medium">{c.challenges.title}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  +{c.challenges.koin_reward} Koins
                </Badge>
              </div>
            ))
          ) : (
            <p className="text-xs text-center text-muted-foreground py-4">
              Nenhum desafio completado nos últimos 7 dias
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>

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
