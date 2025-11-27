import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Unlockable {
  id: string;
  type: 'THEME' | 'AVATAR' | 'BADGE';
  identifier: string;
  name: string;
  description: string;
  required_xp?: number;
  required_streak_days?: number;
  required_challenges_completed?: number;
  required_koins_earned?: number;
  preview_data?: Record<string, any>;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  is_active: boolean;
}

export interface UserUnlock {
  id: string;
  user_id: string;
  unlockable_id: string;
  unlocked_at: string;
  is_equipped: boolean;
  unlock_context?: Record<string, any>;
  unlockable?: Unlockable;
}

export const useUnlockables = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch todos os unlockables disponíveis
  const { data: unlockables = [], isLoading: loadingUnlockables } = useQuery({
    queryKey: ['unlockables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unlockables')
        .select('*')
        .eq('is_active', true)
        .order('rarity', { ascending: false });

      if (error) throw error;
      return data as Unlockable[];
    },
  });

  // Fetch unlocks do usuário atual
  const { data: userUnlocks = [], isLoading: loadingUserUnlocks } = useQuery({
    queryKey: ['user-unlocks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_unlocks')
        .select(`
          *,
          unlockable:unlockables(*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return data as UserUnlock[];
    },
    enabled: !!user?.id,
  });

  // Verificar e desbloquear conquistas automaticamente
  const checkAchievements = useMutation({
    mutationFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase.rpc('check_and_unlock_achievements', {
        p_user_id: user.id,
      });

      if (error) throw error;
      return data as Array<{ id: string; type: string; name: string; rarity: string }>;
    },
    onSuccess: (newlyUnlocked) => {
      if (newlyUnlocked && newlyUnlocked.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['user-unlocks', user?.id] });
        
        // Mostrar toast para cada item desbloqueado
        newlyUnlocked.forEach((item) => {
          const rarityEmoji = {
            COMMON: '⭐',
            RARE: '💎',
            EPIC: '🏆',
            LEGENDARY: '👑',
          }[item.rarity] || '🎉';

          toast.success(`${rarityEmoji} Conquista Desbloqueada!`, {
            description: `Você desbloqueou: ${item.name}`,
            duration: 5000,
          });
        });
      }
    },
  });

  // Equipar um item (tema ou avatar)
  const equipItem = useMutation({
    mutationFn: async ({ unlockId, type }: { unlockId: string; type: 'THEME' | 'AVATAR' }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Desequipar todos os itens do mesmo tipo primeiro
      await supabase
        .from('user_unlocks')
        .update({ is_equipped: false })
        .eq('user_id', user.id)
        .in('unlockable_id', unlockables.filter(u => u.type === type).map(u => u.id));

      // Equipar o novo item
      const { error } = await supabase
        .from('user_unlocks')
        .update({ is_equipped: true })
        .eq('user_id', user.id)
        .eq('unlockable_id', unlockId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-unlocks', user?.id] });
      toast.success('Item equipado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao equipar item');
    },
  });

  // Helpers para verificar se um item está desbloqueado
  const isUnlocked = (unlockableId: string) => {
    return userUnlocks.some((unlock) => unlock.unlockable_id === unlockableId);
  };

  // Obter item equipado de um tipo
  const getEquippedItem = (type: 'THEME' | 'AVATAR' | 'BADGE') => {
    return userUnlocks.find(
      (unlock) => unlock.is_equipped && unlock.unlockable?.type === type
    );
  };

  // Obter todos os unlocks de um tipo específico
  const getUnlocksByType = (type: 'THEME' | 'AVATAR' | 'BADGE') => {
    return unlockables.filter((u) => u.type === type);
  };

  // Obter URL/emoji do avatar equipado
  const getEquippedAvatarData = () => {
    const equippedAvatar = getEquippedItem('AVATAR');
    if (!equippedAvatar?.unlockable) return null;
    
    return {
      emoji: equippedAvatar.unlockable.preview_data?.emoji || '👤',
      color: equippedAvatar.unlockable.preview_data?.color || '#6B7280',
      rarity: equippedAvatar.unlockable.rarity,
      name: equippedAvatar.unlockable.name,
    };
  };

  // Obter badges equipados (até 3 mais recentes)
  const getEquippedBadges = () => {
    return userUnlocks
      .filter((unlock) => unlock.is_equipped && unlock.unlockable?.type === 'BADGE')
      .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime());
  };

  // Obter todos os badges disponíveis mas bloqueados
  const getLockedBadges = () => {
    return unlockables.filter(
      (u) => u.type === 'BADGE' && !isUnlocked(u.id)
    );
  };

  // Verificar se possui badge específico
  const hasBadge = (badgeIdentifier: string) => {
    return userUnlocks.some(
      (unlock) =>
        unlock.unlockable?.type === 'BADGE' &&
        unlock.unlockable?.identifier === badgeIdentifier
    );
  };

  return {
    unlockables,
    userUnlocks,
    isLoading: loadingUnlockables || loadingUserUnlocks,
    checkAchievements: checkAchievements.mutate,
    isCheckingAchievements: checkAchievements.isPending,
    equipItem: equipItem.mutate,
    isEquipping: equipItem.isPending,
    isUnlocked,
    getEquippedItem,
    getUnlocksByType,
    getEquippedAvatarData,
    getEquippedBadges,
    getLockedBadges,
    hasBadge,
  };
};
