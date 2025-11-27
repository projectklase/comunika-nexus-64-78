import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Trophy, Flame, Coins } from 'lucide-react';
import { AchievementBadge } from './AchievementBadge';
import { PremiumAvatar } from './PremiumAvatar';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { cn } from '@/lib/utils';

interface PublicProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
}

export function PublicProfileModal({ open, onOpenChange, studentId }: PublicProfileModalProps) {
  const { getWeightsEnabled } = useSchoolSettings();
  const koinsEnabled = getWeightsEnabled();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['public-profile', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar, total_xp, koins, current_streak_days, best_streak_days')
        .eq('id', studentId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!studentId,
  });

  // Avatar equipado do outro aluno
  const { data: equippedAvatar } = useQuery({
    queryKey: ['public-avatar', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_unlocks')
        .select('*, unlockable:unlockables(*)')
        .eq('user_id', studentId)
        .eq('is_equipped', true)
        .maybeSingle();
      
      if (error) throw error;
      
      // Filtrar apenas avatares
      if (data?.unlockable?.type === 'AVATAR') {
        const unlockable = data.unlockable as any;
        return {
          emoji: unlockable.preview_data?.emoji || '👤',
          rarity: unlockable.rarity || 'COMMON',
          name: unlockable.name,
          imageUrl: unlockable.preview_data?.imageUrl
        };
      }
      return null;
    },
    enabled: open && !!studentId,
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['public-badges', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_unlocks')
        .select('*, unlockable:unlockables(*)')
        .eq('user_id', studentId)
        .eq('is_equipped', true)
        .order('unlocked_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!studentId,
  });

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Carregando perfil...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            Perfil de {profile.name}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Estatísticas e conquistas do aluno
          </DialogDescription>
        </DialogHeader>

        {/* Header com Avatar e Nome */}
        <div className="flex flex-col items-center gap-4 pt-2">
          <div className="relative">
            {equippedAvatar ? (
              <PremiumAvatar 
                emoji={equippedAvatar.emoji}
                rarity={equippedAvatar.rarity as any}
                size="xl"
                imageUrl={equippedAvatar.imageUrl}
                className="h-32 w-32"
              />
            ) : (
              <div className="h-32 w-32 rounded-full bg-primary/20 flex items-center justify-center text-4xl border-4 border-primary/30 shadow-lg shadow-primary/20">
                {profile.name.charAt(0)}
              </div>
            )}
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="flex justify-center gap-3 py-4">
            {badges.map((badge) => (
              badge.unlockable && (
                <AchievementBadge
                  key={badge.id}
                  unlockable={badge.unlockable as any}
                  size="lg"
                />
              )
            ))}
          </div>
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {/* XP */}
          <div className={cn(
            'bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-md',
            'border border-primary/20 rounded-xl p-4 text-center'
          )}>
            <Trophy className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{profile.total_xp?.toLocaleString() || 0}</p>
            <p className="text-sm text-muted-foreground">XP Total</p>
          </div>

          {/* Koins - só aparece se habilitado */}
          {koinsEnabled && (
            <div className={cn(
              'bg-gradient-to-br from-amber-500/10 to-amber-500/5 backdrop-blur-md',
              'border border-amber-500/20 rounded-xl p-4 text-center'
            )}>
              <Coins className="h-6 w-6 mx-auto mb-2 text-amber-500" />
              <p className="text-2xl font-bold">{profile.koins?.toLocaleString() || 0}</p>
              <p className="text-sm text-muted-foreground">Koins</p>
            </div>
          )}

          {/* Streak Atual */}
          <div className={cn(
            'bg-gradient-to-br from-orange-500/10 to-orange-500/5 backdrop-blur-md',
            'border border-orange-500/20 rounded-xl p-4 text-center'
          )}>
            <Flame className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">{profile.current_streak_days || 0}</p>
            <p className="text-sm text-muted-foreground">Dias de Streak</p>
          </div>

          {/* Melhor Streak */}
          <div className={cn(
            'bg-gradient-to-br from-red-500/10 to-red-500/5 backdrop-blur-md',
            'border border-red-500/20 rounded-xl p-4 text-center',
            !koinsEnabled && 'md:col-span-1'
          )}>
            <Flame className="h-6 w-6 mx-auto mb-2 text-red-500" />
            <p className="text-2xl font-bold">{profile.best_streak_days || 0}</p>
            <p className="text-sm text-muted-foreground">Melhor Streak</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
