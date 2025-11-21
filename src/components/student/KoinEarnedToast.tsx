import { useEffect } from 'react';
import { Coins, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRewardsStore } from '@/stores/rewards-store';
import { useStudentGamification } from '@/stores/studentGamification';
import { useAuth } from '@/contexts/AuthContext';

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

      // Add XP for activity completion
      const xpGained = addActivityXP(activityId);

      // Show celebration toast
      toast({
        title: "🎉 Parabéns!",
        description: (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Coins className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">+{koinAmount} Koins</span>
            </div>
            {xpGained > 0 && (
              <div className="flex items-center gap-1">
                <Trophy className="h-4 w-4 text-purple-500" />
                <span className="font-medium">+{xpGained} XP</span>
              </div>
            )}
          </div>
        ),
        duration: 5000,
      });

      onComplete?.();
    }
  }, [user, studentId, activityId, activityTitle, koinAmount, addTransaction, addActivityXP, toast, onComplete]);

  return null;
}