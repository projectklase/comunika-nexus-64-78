import { useEffect } from 'react';
import { Coins, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRewardsStore } from '@/stores/rewards-store';
import { useStudentGamification } from '@/stores/studentGamification';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface KoinEarnedToastProps {
  studentId: string;
  activityId: string;
  activityTitle: string;
  koinAmount: number;
  onComplete?: () => void;
}

export function KoinEarnedToast({ 
  studentId, 
  activityId, 
  activityTitle, 
  koinAmount, 
  onComplete 
}: KoinEarnedToastProps) {
  const { toast } = useToast();
  const { addTransaction } = useRewardsStore();
  const { addActivityXP } = useStudentGamification();
  const { user } = useAuth();

  // Check for active SUBMIT_ACTIVITY challenges
  const { data: activeChallenges = [] } = useQuery({
    queryKey: ['active-challenges', 'SUBMIT_ACTIVITY'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('id, action_target, is_active')
        .eq('is_active', true)
        .eq('action_target', 'SUBMIT_ACTIVITY');
      
      if (error) {
        console.error('Erro ao buscar desafios ativos:', error);
        return [];
      }
      
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  useEffect(() => {
    // Verificação de role: apenas alunos devem receber toasts de gamificação
    if (!user || user.role !== 'aluno') {
      console.warn('[KoinEarnedToast] Bloqueado: usuário não é aluno', { 
        userId: user?.id, 
        role: user?.role 
      });
      return;
    }

    if (koinAmount > 0) {
      // Get current balance
      const currentBalance = useRewardsStore.getState().getStudentBalance(studentId);
      
      // Add Koin transaction
      addTransaction({
        studentId,
        type: 'EARN',
        amount: koinAmount,
        balanceBefore: currentBalance.availableBalance,
        balanceAfter: currentBalance.availableBalance + koinAmount,
        source: `ACTIVITY:${activityId}`,
        description: `Atividade concluída: ${activityTitle}`
      });

      // Add XP for activity completion (only if there are active challenges)
      const hasSubmitActivityChallenges = activeChallenges.length > 0;
      const xpGained = hasSubmitActivityChallenges ? addActivityXP(activityId) : 0;

      // Show celebration toast only if there are active challenges or Koins were earned
      // Always show if Koins > 0, but only show XP if challenges exist
      if (koinAmount > 0 || (hasSubmitActivityChallenges && xpGained > 0)) {
        toast({
          title: "🎉 Parabéns!",
          description: (
            <div className="flex items-center gap-3">
              {koinAmount > 0 && (
                <div className="flex items-center gap-1">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">+{koinAmount} Koins</span>
                </div>
              )}
              {hasSubmitActivityChallenges && xpGained > 0 && (
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">+{xpGained} XP</span>
                </div>
              )}
            </div>
          ),
          duration: 5000,
        });
      }

      onComplete?.();
    }
  }, [user, studentId, activityId, activityTitle, koinAmount, addTransaction, addActivityXP, toast, onComplete, activeChallenges]);

  return null;
}