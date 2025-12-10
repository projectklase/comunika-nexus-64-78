import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { applyPremiumTheme } from './use-theme';
import { triggerCelebration } from '@/utils/celebration-effects';
import { useState } from 'react';

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
  
  // Estado para controlar modal de celebração
  const [celebrationModalOpen, setCelebrationModalOpen] = useState(false);
  const [currentCelebration, setCurrentCelebration] = useState<{
    id: string;
    name: string;
    type: 'AVATAR' | 'THEME' | 'BADGE';
    rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
    preview_data?: Record<string, any>;
  } | null>(null);
  const [isFirstUnlock, setIsFirstUnlock] = useState(false);

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
      return data as Array<{ 
        id: string; 
        type: 'AVATAR' | 'THEME' | 'BADGE';
        name: string; 
        rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
        preview_data?: Record<string, any>;
      }>;
    },
    onSuccess: async (newlyUnlocked) => {
      if (newlyUnlocked && newlyUnlocked.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['user-unlocks', user?.id] });
        
        // Verificar se é o primeiro desbloqueio do aluno
        const totalUnlocks = userUnlocks.length;
        const firstUnlock = totalUnlocks === 0;
        setIsFirstUnlock(firstUnlock);
        
        // Ordenar por raridade (mostrar o mais raro primeiro)
        const rarityOrder = { 
          LEGENDARY: 5, 
          EPIC: 4, 
          RARE: 3, 
          UNCOMMON: 2, 
          COMMON: 1 
        };
        const sortedByRarity = [...newlyUnlocked].sort((a, b) => {
          return (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
        });
        
        // Mostrar celebração para cada item com delay progressivo
        for (let i = 0; i < sortedByRarity.length; i++) {
          const item = sortedByRarity[i];
          
          // Delay entre celebrações (3s para cada)
          await new Promise(resolve => setTimeout(resolve, i * 3000));
          
          // Disparar confetti baseado na raridade
          triggerCelebration(item.rarity);
          
          // Abrir modal de celebração
          setCurrentCelebration(item);
          setCelebrationModalOpen(true);
          
          // Toast adicional para feedback
          const rarityEmoji = {
            LEGENDARY: '👑',
            EPIC: '🏆',
            RARE: '💎',
            UNCOMMON: '⭐',
            COMMON: '🎉',
          }[item.rarity] || '🎉';

          toast.success(`${rarityEmoji} Conquista Desbloqueada!`, {
            description: `${item.name}`,
            duration: 3000,
          });
        }
      }
    },
  });

  // Equipar um item (tema ou avatar)
  const equipItem = useMutation({
    mutationFn: async ({ unlockId, type }: { unlockId: string; type: 'THEME' | 'AVATAR' }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Verificar se o item está desbloqueado (exceto para admins que têm acesso total)
      if (user.role !== 'administrador') {
        const unlockable = unlockables.find(u => u.id === unlockId);
        const alreadyUnlocked = userUnlocks?.some(u => u.unlockable_id === unlockId);
        
        // COMMON items sem requisitos são sempre desbloqueados
        const isCommonWithoutReqs = unlockable && 
          unlockable.rarity === 'COMMON' && 
          !unlockable.required_xp && 
          !unlockable.required_streak_days && 
          !unlockable.required_challenges_completed;
        
        if (!alreadyUnlocked && !isCommonWithoutReqs) {
          throw new Error('Item não está desbloqueado');
        }
      }

      // Desequipar todos os itens do mesmo tipo primeiro
      await supabase
        .from('user_unlocks')
        .update({ is_equipped: false })
        .eq('user_id', user.id)
        .in('unlockable_id', unlockables.filter(u => u.type === type).map(u => u.id));

      // Equipar o novo item - usar UPSERT para criar registro se não existir
      const { error } = await supabase
        .from('user_unlocks')
        .upsert(
          {
            user_id: user.id,
            unlockable_id: unlockId,
            is_equipped: true,
            unlocked_at: new Date().toISOString(),
            unlock_context: { equipped_by_role: true }
          },
          {
            onConflict: 'user_id,unlockable_id',
            ignoreDuplicates: false
          }
        );

      if (error) throw error;
      
      return { unlockId, type };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-unlocks', user?.id] });
      
      // Se for um tema, aplicar visualmente
      if (data.type === 'THEME') {
        const theme = unlockables.find(u => u.id === data.unlockId);
        if (theme?.identifier) {
          applyPremiumTheme(theme.identifier);
        }
      }
      
      toast.success('Item equipado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao equipar item');
    },
  });

  // Desequipar todos os temas premium (quando usuário seleciona tema grátis)
  const unequipTheme = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const themeIds = unlockables
        .filter(u => u.type === 'THEME')
        .map(u => u.id);

      if (themeIds.length > 0) {
        await supabase
          .from('user_unlocks')
          .update({ is_equipped: false })
          .eq('user_id', user.id)
          .in('unlockable_id', themeIds);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-unlocks', user?.id] });
    },
  });

  // Helpers para verificar se um item está desbloqueado
  const isUnlocked = (unlockableId: string) => {
    // Administradores têm acesso a todos os itens desbloqueáveis
    if (user?.role === 'administrador') {
      return true;
    }
    
    // COMMON avatars/items without requirements are always unlocked
    const unlockable = unlockables.find(u => u.id === unlockableId);
    if (unlockable && 
        unlockable.rarity === 'COMMON' && 
        !unlockable.required_xp && 
        !unlockable.required_streak_days && 
        !unlockable.required_challenges_completed) {
      return true;
    }
    
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
      imageUrl: equippedAvatar.unlockable.preview_data?.imageUrl,
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
    unequipTheme: unequipTheme.mutate,
    isUnlocked,
    getEquippedItem,
    getUnlocksByType,
    getEquippedAvatarData,
    getEquippedBadges,
    getLockedBadges,
    hasBadge,
    // Celebration modal state
    celebrationModalOpen,
    setCelebrationModalOpen,
    currentCelebration,
    isFirstUnlock,
  };
};
