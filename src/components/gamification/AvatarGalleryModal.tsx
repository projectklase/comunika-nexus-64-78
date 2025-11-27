import { useState } from 'react';
import { Check, Lock, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useUnlockables } from '@/hooks/useUnlockables';
import { PremiumAvatar } from './PremiumAvatar';
import { UnlockBadge } from './UnlockBadge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface AvatarGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RARITY_LABELS = {
  COMMON: { label: 'Comuns (Gratuitos)', icon: '⚪', color: 'text-gray-400' },
  UNCOMMON: { label: 'Incomuns', icon: '🟢', color: 'text-green-500' },
  RARE: { label: 'Raros', icon: '🔵', color: 'text-blue-500' },
  EPIC: { label: 'Épicos', icon: '🟣', color: 'text-purple-500' },
  LEGENDARY: { label: 'Lendários', icon: '🟡', color: 'text-yellow-400' },
};

export function AvatarGalleryModal({ open, onOpenChange }: AvatarGalleryModalProps) {
  const { user } = useAuth();
  const { 
    unlockables, 
    isUnlocked, 
    equipItem, 
    isEquipping,
    getEquippedItem,
  } = useUnlockables();

  const equippedAvatar = getEquippedItem('AVATAR');
  const avatars = unlockables.filter((u) => u.type === 'AVATAR');

  // Determine which avatars are available based on role
  const isAvatarAvailable = (avatar: any) => {
    // Admins have all avatars
    if (user?.role === 'administrador') return true;
    
    // Staff (secretaria, professor) get COMMON and UNCOMMON free
    if (user?.role === 'secretaria' || user?.role === 'professor') {
      return avatar.rarity === 'COMMON' || avatar.rarity === 'UNCOMMON';
    }
    
    // Students use gamification system
    return isUnlocked(avatar.id);
  };

  const avatarsByRarity = {
    COMMON: avatars.filter((a) => a.rarity === 'COMMON'),
    UNCOMMON: avatars.filter((a) => a.rarity === 'UNCOMMON'),
    RARE: avatars.filter((a) => a.rarity === 'RARE'),
    EPIC: avatars.filter((a) => a.rarity === 'EPIC'),
    LEGENDARY: avatars.filter((a) => a.rarity === 'LEGENDARY'),
  };

  const handleSelectAvatar = (avatarId: string, avatarName: string, avatar: any) => {
    // Check if avatar is available for this user
    if (!isAvatarAvailable(avatar)) {
      toast.error('Avatar bloqueado', {
        description: getRequirementText(avatar),
      });
      return;
    }

    equipItem(
      { unlockId: avatarId, type: 'AVATAR' },
      {
        onSuccess: () => {
          toast.success(`Avatar "${avatarName}" equipado!`, {
            description: 'Seu novo avatar está ativo',
            icon: '✨',
          });
          onOpenChange(false);
        },
      }
    );
  };

  const getRequirementText = (avatar: any) => {
    const parts = [];
    if (avatar.required_xp) parts.push(`${avatar.required_xp} XP`);
    if (avatar.required_streak_days) parts.push(`${avatar.required_streak_days} dias streak`);
    if (avatar.required_challenges_completed) parts.push(`${avatar.required_challenges_completed} desafios`);
    return parts.join(' ou ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            Galeria de Avatares
          </DialogTitle>
          <DialogDescription>
            Escolha seu avatar ou desbloqueie novos completando desafios e acumulando XP!
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] px-6 pb-6">
          <div className="space-y-8">
            {Object.entries(avatarsByRarity).map(([rarity, avatarList]) => {
              if (avatarList.length === 0) return null;
              
              const rarityConfig = RARITY_LABELS[rarity as keyof typeof RARITY_LABELS];
              
              return (
                <div key={rarity} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{rarityConfig.icon}</span>
                    <h3 className={cn('text-lg font-semibold', rarityConfig.color)}>
                      {rarityConfig.label}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {avatarList.map((avatar) => {
                      const available = isAvatarAvailable(avatar);
                      const isEquipped = equippedAvatar?.unlockable_id === avatar.id;

                      return (
                        <button
                          key={avatar.id}
                          onClick={() => {
                            if (available && !isEquipped) {
                              handleSelectAvatar(avatar.id, avatar.name, avatar);
                            }
                          }}
                          disabled={!available || isEquipped || isEquipping}
                          className={cn(
                            'relative p-4 rounded-xl border-2 transition-all',
                            'hover:scale-105 active:scale-95',
                            available
                              ? 'border-border bg-card hover:bg-accent cursor-pointer'
                              : 'border-muted bg-muted/50 cursor-not-allowed opacity-60',
                            isEquipped && 'ring-2 ring-primary ring-offset-2'
                          )}
                        >
                          <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                              <PremiumAvatar
                                emoji={avatar.preview_data?.emoji || '👤'}
                                rarity={avatar.rarity as any}
                                size="lg"
                              />
                              
                              {isEquipped && (
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                  <Check className="w-4 h-4 text-primary-foreground" />
                                </div>
                              )}
                              
                              {!available && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                                  <Lock className="w-8 h-8 text-muted-foreground" />
                                </div>
                              )}
                            </div>

                            <div className="text-center space-y-1">
                              <p className="text-sm font-medium line-clamp-1">
                                {avatar.name}
                              </p>
                              
                              {!available && user?.role === 'aluno' && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {getRequirementText(avatar)}
                                </p>
                              )}
                              
                              {isEquipped && (
                                <span className="text-xs text-primary font-semibold">
                                  Equipado
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="absolute top-2 left-2">
                            <UnlockBadge
                              rarity={avatar.rarity as any}
                              isLocked={!available}
                              size="sm"
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
