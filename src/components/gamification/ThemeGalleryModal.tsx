import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUnlockables } from '@/hooks/useUnlockables';
import { UnlockableCard } from './UnlockableCard';
import { useStudentGamification } from '@/stores/studentGamification';
import { Loader2 } from 'lucide-react';

interface ThemeGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ThemeGalleryModal({ open, onOpenChange }: ThemeGalleryModalProps) {
  const {
    getUnlocksByType,
    isUnlocked,
    getEquippedItem,
    equipItem,
    isEquipping,
    isLoading,
  } = useUnlockables();

  const { xp, streak } = useStudentGamification();

  const themes = getUnlocksByType('THEME');
  const equippedTheme = getEquippedItem('THEME');

  // Mock data for challenges and koins (você pode integrar com hooks reais)
  const currentStats = {
    xp,
    streak,
    challengesCompleted: 0, // TODO: integrar com hook de desafios
    koinsEarned: 0, // TODO: integrar com koin transactions
  };

  if (isLoading) {
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

        <ScrollArea className="h-[60vh] pr-4">
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
