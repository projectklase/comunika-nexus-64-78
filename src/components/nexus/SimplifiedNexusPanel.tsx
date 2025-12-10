import { useQuery } from '@tanstack/react-query';
import { ChallengeHub } from './ChallengeHub';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { ChallengeCelebration } from '@/components/gamification/ChallengeCelebration';
export function SimplifiedNexusPanel() {
  const { user } = useAuth();
  const { getKoinsEnabled } = useSchoolSettings();
  const koinsEnabled = getKoinsEnabled();

  // QOL 1: Contador de Koins pendentes baseado no koinReward real de cada atividade
  const { data: pendingKoins } = useQuery({
    queryKey: ['pending_koins', user?.id],
    queryFn: async () => {
      if (!user) return { count: 0, potentialKoins: 0 };
      
      // Buscar entregas AGUARDANDO do aluno
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('deliveries')
        .select('id, post_id')
        .eq('student_id', user.id)
        .eq('review_status', 'AGUARDANDO');
      
      if (deliveriesError) throw deliveriesError;
      if (!deliveries || deliveries.length === 0) {
        return { count: 0, potentialKoins: 0 };
      }

      // Buscar os dados das atividades (posts) para obter koinReward real
      const postIds = [...new Set(deliveries.map(d => d.post_id))];
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, activity_meta')
        .in('id', postIds);

      if (postsError) throw postsError;

      // Criar mapa de koinReward por post_id
      const koinRewardMap = new Map<string, number>();
      posts?.forEach(post => {
        const reward = (post.activity_meta as any)?.koinReward || 0;
        koinRewardMap.set(post.id, reward);
      });

      // Calcular total de Koins potenciais com base no reward real de cada atividade
      const totalPotentialKoins = deliveries.reduce((sum, delivery) => {
        const reward = koinRewardMap.get(delivery.post_id) || 0;
        return sum + reward;
      }, 0);

      return {
        count: deliveries.length,
        potentialKoins: totalPotentialKoins
      };
    },
    enabled: !!user,
    refetchInterval: 30000
  });

  return (
    <div className="space-y-6">
      {/* Componente de celebração de desafios (invisível, monitora notificações) */}
      <ChallengeCelebration />
      {/* QOL 1: Alert de Koins pendentes */}
      {koinsEnabled && pendingKoins && pendingKoins.count > 0 && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-sm">
            Você tem <strong>{pendingKoins.count} {pendingKoins.count === 1 ? 'atividade' : 'atividades'}</strong> aguardando aprovação.
            <br />
            💰 <strong>~{pendingKoins.potentialKoins} Koins</strong> serão creditados quando {pendingKoins.count === 1 ? 'for aprovada' : 'forem aprovadas'}!
          </AlertDescription>
        </Alert>
      )}

      <Card className="glass-card border-border/50 p-6">
        <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Hub de Desafios
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Complete desafios e ganhe Koins!
        </p>
        <ChallengeHub />
      </Card>
    </div>
  );
}
