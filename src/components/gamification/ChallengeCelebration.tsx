import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface ChallengeNotificationMeta {
  source?: string;
  challengeTitle?: string;
  koinsEarned?: number;
  xpEarned?: number;
  celebrationType?: string;
}

export function ChallengeCelebration() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastCelebratedRef = useRef<string | null>(null);

  // Poll for challenge completion notifications
  const { data: celebrationNotification } = useQuery({
    queryKey: ['challenge-celebration', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('notifications')
        .select('id, meta, created_at')
        .eq('user_id', user.id)
        .eq('type', 'KOIN_BONUS')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      // Check if it's a challenge completion
      const meta = data?.meta as ChallengeNotificationMeta | null;
      if (data && meta?.source === 'challenge_system') {
        return {
          id: data.id,
          challengeTitle: meta.challengeTitle || 'Desafio',
          koinsEarned: meta.koinsEarned || 0,
          xpEarned: meta.xpEarned || 0,
          celebrationType: meta.celebrationType || 'confetti'
        };
      }
      
      return null;
    },
    enabled: !!user,
    refetchInterval: 5000 // Check every 5 seconds
  });

  // Trigger celebration when notification found
  useEffect(() => {
    if (!celebrationNotification) return;
    if (lastCelebratedRef.current === celebrationNotification.id) return;

    lastCelebratedRef.current = celebrationNotification.id;

    // Fire confetti
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // Show celebratory toast
    toast.success(
      <div className="flex flex-col gap-1">
        <span className="font-bold text-lg">🎉 Desafio Completado!</span>
        <span className="text-sm opacity-90">"{celebrationNotification.challengeTitle}"</span>
        <div className="flex gap-3 mt-1">
          <span className="text-yellow-500 font-semibold">
            +{celebrationNotification.koinsEarned} Koins
          </span>
          <span className="text-blue-400 font-semibold">
            +{celebrationNotification.xpEarned} XP
          </span>
        </div>
      </div>,
      {
        duration: 5000,
        className: 'challenge-celebration-toast'
      }
    );

    // Mark notification as read
    supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', celebrationNotification.id)
      .then(() => {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['challenge-celebration'] });
        queryClient.invalidateQueries({ queryKey: ['student-challenges'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });

  }, [celebrationNotification, queryClient]);

  // This component doesn't render anything visible
  return null;
}
