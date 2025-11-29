import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PremiumAvatar } from './PremiumAvatar';
import { Sparkles, Crown } from 'lucide-react';

interface UnlockCelebrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unlockedItem: {
    id: string;
    name: string;
    type: 'AVATAR' | 'THEME' | 'BADGE';
    rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
    preview_data?: Record<string, any>;
  } | null;
  isFirstUnlock?: boolean;
}

const getRarityConfig = (rarity: string) => {
  switch (rarity) {
    case 'LEGENDARY':
      return {
        label: 'LENDÁRIO',
        color: 'from-yellow-400 via-yellow-300 to-yellow-500',
        textColor: 'text-yellow-400',
        borderColor: 'border-yellow-400',
        bgGlow: 'bg-yellow-400/10',
        animation: 'animate-unlock-legendary',
        duration: 7000,
        icon: Crown,
      };
    case 'EPIC':
      return {
        label: 'ÉPICO',
        color: 'from-purple-500 via-pink-500 to-purple-600',
        textColor: 'text-purple-400',
        borderColor: 'border-purple-400',
        bgGlow: 'bg-purple-400/10',
        animation: 'animate-unlock-epic',
        duration: 5000,
        icon: Sparkles,
      };
    case 'RARE':
      return {
        label: 'RARO',
        color: 'from-blue-500 via-cyan-400 to-blue-600',
        textColor: 'text-blue-400',
        borderColor: 'border-blue-400',
        bgGlow: 'bg-blue-400/10',
        animation: 'animate-unlock-rare',
        duration: 4000,
        icon: Sparkles,
      };
    case 'UNCOMMON':
      return {
        label: 'INCOMUM',
        color: 'from-green-500 via-emerald-400 to-green-600',
        textColor: 'text-green-400',
        borderColor: 'border-green-400',
        bgGlow: 'bg-green-400/10',
        animation: 'animate-unlock-uncommon',
        duration: 3000,
        icon: Sparkles,
      };
    default: // COMMON
      return {
        label: 'COMUM',
        color: 'from-gray-400 via-gray-300 to-gray-500',
        textColor: 'text-gray-400',
        borderColor: 'border-gray-400',
        bgGlow: 'bg-gray-400/10',
        animation: 'animate-unlock-common',
        duration: 2000,
        icon: Sparkles,
      };
  }
};

export function UnlockCelebrationModal({
  open,
  onOpenChange,
  unlockedItem,
  isFirstUnlock,
}: UnlockCelebrationModalProps) {
  if (!unlockedItem) return null;

  const config = getRarityConfig(unlockedItem.rarity);
  const Icon = config.icon;

  // Auto-close após duração específica
  if (open) {
    setTimeout(() => onOpenChange(false), config.duration);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`max-w-md border-2 ${config.borderColor} ${config.bgGlow} backdrop-blur-xl overflow-hidden`}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Legendary Special Effects */}
        {unlockedItem.rarity === 'LEGENDARY' && (
          <>
            {/* Raios dourados girando */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              <div className="w-[400px] h-[400px] animate-golden-rays">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-40 bg-gradient-to-t from-yellow-400/80 via-yellow-400/40 to-transparent"
                    style={{
                      left: '50%',
                      top: '50%',
                      transformOrigin: '0 0',
                      transform: `rotate(${i * 30}deg)`,
                    }}
                  />
                ))}
              </div>
            </div>
            
            {/* Partículas flutuantes de ouro */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-yellow-400 animate-float-particle"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-6 py-8">
          {/* First Unlock Banner */}
          {isFirstUnlock && (
            <div className="w-full text-center py-4 px-6 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 rounded-xl border border-primary/30 animate-fade-in">
              <span className="text-3xl mb-2 block">🎊</span>
              <p className="text-xl font-bold text-primary">Sua Primeira Conquista!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Parabéns por começar sua jornada de colecionador!
              </p>
            </div>
          )}

          {/* Rarity Badge */}
          <Badge 
            className={`text-lg font-bold px-6 py-2 bg-gradient-to-r ${config.color} text-background border-0 shadow-lg`}
          >
            <Icon className="w-5 h-5 mr-2" />
            {config.label}
          </Badge>

          {/* Avatar/Item Display */}
          <div className={`relative ${config.animation}`}>
            {unlockedItem.type === 'AVATAR' && unlockedItem.preview_data ? (
              <PremiumAvatar
                emoji={unlockedItem.preview_data.emoji || '👤'}
                rarity={unlockedItem.rarity}
                size="xl"
                className="scale-150"
              />
            ) : (
              <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center text-6xl shadow-2xl`}>
                {unlockedItem.type === 'THEME' ? '🎨' : '🏅'}
              </div>
            )}
            
            {/* Pulsating glow effect */}
            <div className={`absolute inset-0 rounded-full blur-2xl opacity-50 ${config.bgGlow} animate-glow-pulse`} />
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h2 className={`text-3xl font-bold ${config.textColor} animate-fade-in`}>
              {unlockedItem.name}
            </h2>
            <p className="text-muted-foreground text-lg">
              {unlockedItem.rarity === 'LEGENDARY' && '✨ Uma conquista que poucos alcançam! ✨'}
              {unlockedItem.rarity === 'EPIC' && '🏆 Conquista Épica! 🏆'}
              {unlockedItem.rarity === 'RARE' && '💎 Conquista Rara! 💎'}
              {unlockedItem.rarity === 'UNCOMMON' && '⭐ Bem Feito! ⭐'}
              {unlockedItem.rarity === 'COMMON' && '🎉 Parabéns! 🎉'}
            </p>
          </div>

          {/* Type indicator */}
          <p className="text-sm text-muted-foreground">
            {unlockedItem.type === 'AVATAR' && 'Novo Avatar Desbloqueado'}
            {unlockedItem.type === 'THEME' && 'Novo Tema Desbloqueado'}
            {unlockedItem.type === 'BADGE' && 'Nova Conquista Desbloqueada'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
