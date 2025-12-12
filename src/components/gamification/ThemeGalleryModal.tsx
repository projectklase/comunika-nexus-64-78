import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUnlockables } from '@/hooks/useUnlockables';
import { UnlockableCard } from './UnlockableCard';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface ThemeGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ThemeGalleryModal({ open, onOpenChange }: ThemeGalleryModalProps) {
  const { user } = useAuth();
  const {
    getUnlocksByType,
    isUnlocked,
    getEquippedItem,
    equipItem,
    isEquipping,
    isLoading,
    checkAchievements,
  } = useUnlockables();

  // Verificar conquistas automaticamente ao abrir o modal
  useEffect(() => {
    if (open && user) {
      checkAchievements();
    }
  }, [open, user, checkAchievements]);

  // Buscar estatísticas reais do banco de dados
  const { data: realStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['user-real-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Buscar perfil - USANDO level_xp (permanente) em vez de total_xp (gastável)
      const { data: profile } = await supabase
        .from('profiles')
        .select('level_xp, current_streak_days, best_streak_days, koins')
        .eq('id', user.id)
        .single();
      
      // Contar desafios completados
      const { count: challengesCompleted } = await supabase
        .from('student_challenges')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('status', 'COMPLETED');
      
      return {
        xp: profile?.level_xp || 0, // level_xp é permanente, nunca diminui
        streak: profile?.best_streak_days || 0,
        challengesCompleted: challengesCompleted || 0,
        koinsEarned: profile?.koins || 0,
      };
    },
    enabled: !!user?.id && open,
  });

  const themes = getUnlocksByType('THEME');
  const equippedTheme = getEquippedItem('THEME');

  const currentStats = realStats || {
    xp: 0,
    streak: 0,
    challengesCompleted: 0,
    koinsEarned: 0,
  };

  if (isLoading || isLoadingStats) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            🎨 Galeria de Temas Premium
          </DialogTitle>
          <DialogDescription>
            Desbloqueie temas incríveis completando desafios e conquistando XP!
          </DialogDescription>
        </DialogHeader>

        {/* Estatísticas do usuário */}
        <div className="p-3 rounded-lg bg-muted/50 border">
          <p className="font-medium text-sm">Suas estatísticas</p>
          <p className="text-xs text-muted-foreground">
            ⚡ {currentStats.xp} XP • 🔥 {currentStats.streak} dias streak • 🎯 {currentStats.challengesCompleted} desafios
          </p>
        </div>

        <ScrollArea className="h-[50vh] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {themes.map((theme) => (
              <UnlockableCard
                key={theme.id}
                unlockable={theme}
                isUnlocked={isUnlocked(theme.id)}
                isEquipped={equippedTheme?.unlockable_id === theme.id}
                onEquip={() => equipItem({ unlockId: theme.id, type: 'THEME' })}
                currentStats={currentStats}
                showRequirements
              />
            ))}
          </div>

          {themes.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum tema premium disponível no momento.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
