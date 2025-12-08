import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUnlockables } from '@/hooks/useUnlockables';
import { AchievementBadge } from './AchievementBadge';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BadgeSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBadges: string[];
  onSave: (selectedBadges: string[]) => Promise<void>;
}

export function BadgeSelectorModal({ open, onOpenChange, currentBadges, onSave }: BadgeSelectorModalProps) {
  const [selectedBadges, setSelectedBadges] = useState<string[]>(currentBadges);
  const [isSaving, setIsSaving] = useState(false);
  const { userUnlocks, isLoading: isLoadingUnlocks } = useUnlockables();

  useEffect(() => {
    setSelectedBadges(currentBadges);
  }, [currentBadges, open]);

  const equippedBadges = userUnlocks?.filter(unlock => 
    unlock.unlockable?.type === 'BADGE'
  ) || [];

  const handleToggleBadge = (badgeId: string) => {
    setSelectedBadges(prev => {
      if (prev.includes(badgeId)) {
        return prev.filter(id => id !== badgeId);
      } else {
        if (prev.length >= 5) {
          toast.error('Você pode selecionar no máximo 5 badges');
          return prev;
        }
        return [...prev, badgeId];
      }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(selectedBadges);
      toast.success('Badges favoritos salvos!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving badges:', error);
      toast.error('Erro ao salvar badges');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Selecione até 5 Badges Favoritos</DialogTitle>
          <DialogDescription>
            Escolha os badges que serão exibidos no seu perfil público
          </DialogDescription>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-4">
          {selectedBadges.length}/5 selecionados
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {isLoadingUnlocks ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-muted-foreground">Carregando badges...</span>
            </div>
          ) : equippedBadges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Você ainda não desbloqueou nenhum badge
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 p-2">
              {equippedBadges.map((unlock) => (
                <div
                  key={unlock.id}
                  onClick={() => handleToggleBadge(unlock.unlockable_id)}
                  className={cn(
                    'relative cursor-pointer p-3 rounded-lg border-2 transition-all',
                    selectedBadges.includes(unlock.unlockable_id)
                      ? 'border-primary bg-primary/10'
                      : 'border-transparent hover:border-muted-foreground/30'
                  )}
                >
                  <AchievementBadge unlockable={unlock.unlockable!} size="lg" />
                  {selectedBadges.includes(unlock.unlockable_id) && (
                    <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
