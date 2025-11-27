import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PremiumAvatar } from './PremiumAvatar';
import { Lock, Trophy, Flame, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LockedAvatarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avatar: {
    id: string;
    name: string;
    rarity: string;
    required_xp?: number | null;
    required_streak_days?: number | null;
    required_challenges_completed?: number | null;
    preview_data?: {
      emoji?: string;
      imageUrl?: string;
    } | null;
  } | null;
  currentProgress: {
    xp: number;
    streak: number;
    challengesCompleted: number;
  };
}

const RARITY_COLORS = {
  COMMON: 'text-gray-400 border-gray-400',
  UNCOMMON: 'text-green-500 border-green-500',
  RARE: 'text-blue-500 border-blue-500',
  EPIC: 'text-purple-500 border-purple-500',
  LEGENDARY: 'text-yellow-400 border-yellow-400',
};

const RARITY_LABELS = {
  COMMON: 'Comum',
  UNCOMMON: 'Incomum',
  RARE: 'Raro',
  EPIC: 'Épico',
  LEGENDARY: 'Lendário',
};

export function LockedAvatarModal({ open, onOpenChange, avatar, currentProgress }: LockedAvatarModalProps) {
  if (!avatar) return null;

  const requirements = [
    {
      icon: Trophy,
      label: 'XP Necessário',
      required: avatar.required_xp || 0,
      current: currentProgress.xp,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      icon: Flame,
      label: 'Dias de Streak',
      required: avatar.required_streak_days || 0,
      current: currentProgress.streak,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      icon: Target,
      label: 'Desafios Completos',
      required: avatar.required_challenges_completed || 0,
      current: currentProgress.challengesCompleted,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
  ].filter(req => req.required > 0);

  const totalProgress = requirements.length > 0
    ? requirements.reduce((sum, req) => sum + (req.current / req.required) * 100, 0) / requirements.length
    : 0;

  const getMotivationalMessage = () => {
    if (totalProgress >= 80) return '🎯 Você está quase lá! Continue assim!';
    if (totalProgress >= 50) return '💪 Você está no caminho certo para desbloquear este avatar!';
    if (totalProgress >= 25) return '🌟 Bom progresso! Continue se dedicando!';
    return '🚀 Comece sua jornada para desbloquear este avatar incrível!';
  };

  const rarityColor = RARITY_COLORS[avatar.rarity as keyof typeof RARITY_COLORS] || RARITY_COLORS.COMMON;
  const rarityLabel = RARITY_LABELS[avatar.rarity as keyof typeof RARITY_LABELS] || 'Comum';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Avatar Bloqueado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center gap-3 p-6 bg-accent/50 rounded-xl border-2 border-dashed border-border">
            <PremiumAvatar
              emoji={avatar.preview_data?.emoji || '👤'}
              rarity={avatar.rarity as any}
              size="xl"
              imageUrl={avatar.preview_data?.imageUrl}
            />
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold">{avatar.name}</h3>
              <span className={cn('inline-block px-3 py-1 rounded-full text-xs font-semibold border', rarityColor)}>
                ⭐ {rarityLabel}
              </span>
            </div>
          </div>

          {/* Requirements */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground">📊 Requisitos para Desbloquear:</h4>
            
            {requirements.map((req, index) => {
              const Icon = req.icon;
              const progress = Math.min((req.current / req.required) * 100, 100);
              const remaining = Math.max(req.required - req.current, 0);
              
              return (
                <div key={index} className={cn('p-4 rounded-lg space-y-3', req.bgColor)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn('h-4 w-4', req.color)} />
                      <span className="text-sm font-medium">{req.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {req.current}/{req.required}
                    </span>
                  </div>
                  
                  <Progress value={progress} className="h-2" />
                  
                  {remaining > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Faltam <span className="font-semibold text-foreground">{remaining}</span> para completar
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Motivational Message */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg backdrop-blur-sm">
            <p className="text-sm text-center text-foreground">
              {getMotivationalMessage()}
            </p>
          </div>

          {/* Close Button */}
          <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
