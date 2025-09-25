import { useEffect } from 'react';
import { Coins, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRewardsStore } from '@/stores/rewards-store';
import { useStudentGamification } from '@/stores/studentGamification';

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

  useEffect(() => {
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
  }, [studentId, activityId, activityTitle, koinAmount, addTransaction, addActivityXP, toast, onComplete]);

  return null;
}