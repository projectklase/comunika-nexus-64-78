import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BadgeRequirementsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unlockable: {
    name: string;
    description?: string;
    rarity: string;
    preview_data?: {
      emoji?: string;
    } | null;
    required_xp?: number | null;
    required_streak_days?: number | null;
    required_challenges_completed?: number | null;
    required_koins_earned?: number | null;
  };
  currentStats: {
    xp: number;
    streak: number;
    challengesCompleted: number;
    koinsEarned?: number;
  };
  isUnlocked?: boolean;
}

const RARITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  COMMON: { label: 'Comum', color: 'text-muted-foreground', bgColor: 'bg-muted/50' },
  UNCOMMON: { label: 'Incomum', color: 'text-green-500', bgColor: 'bg-green-500/10' },
  RARE: { label: 'Raro', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  EPIC: { label: 'Épico', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  LEGENDARY: { label: 'Lendário', color: 'text-amber-400', bgColor: 'bg-amber-400/10' },
};

export function BadgeRequirementsModal({
  open,
  onOpenChange,
  unlockable,
  currentStats,
  isUnlocked = false,
}: BadgeRequirementsModalProps) {
  const emoji = unlockable.preview_data?.emoji || '🏆';
  const rarityConfig = RARITY_CONFIG[unlockable.rarity] || RARITY_CONFIG.COMMON;

  const requirements = [
    {
      key: 'xp',
      label: 'XP',
      icon: '⚡',
      current: currentStats.xp,
      required: unlockable.required_xp,
    },
    {
      key: 'streak',
      label: 'Dias de Streak',
      icon: '🔥',
      current: currentStats.streak,
      required: unlockable.required_streak_days,
    },
    {
      key: 'challenges',
      label: 'Desafios Completos',
      icon: '🎯',
      current: currentStats.challengesCompleted,
      required: unlockable.required_challenges_completed,
    },
    {
      key: 'koins',
      label: 'Koins Acumulados',
      icon: '🪙',
      current: currentStats.koinsEarned || 0,
      required: unlockable.required_koins_earned,
    },
  ].filter(req => req.required != null && req.required > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "max-w-[calc(100%-24px)] sm:max-w-sm mx-3 sm:mx-auto",
          "bg-background/80 backdrop-blur-xl",
          "border border-white/10",
          "shadow-2xl shadow-primary/20",
          "p-0 gap-0",
          "[&>button]:hidden"
        )}
      >
        {/* Custom close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 bg-muted/80 backdrop-blur-sm hover:bg-muted transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Header com emoji e nome */}
        <DialogHeader className="p-5 pb-4 text-center border-b border-border/50">
          <div className="flex flex-col items-center gap-3">
            <div className={cn(
              "text-5xl p-4 rounded-2xl",
              rarityConfig.bgColor,
              "border border-white/10"
            )}>
              {emoji}
            </div>
            
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold">
                {unlockable.name}
              </DialogTitle>
              
              <span className={cn(
                "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                rarityConfig.bgColor,
                rarityConfig.color
              )}>
                ⬡ {rarityConfig.label}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Body com descrição e requisitos */}
        <div className="p-5 space-y-5">
          {/* Descrição */}
          {unlockable.description && (
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              {unlockable.description}
            </p>
          )}

          {/* Requisitos */}
          {requirements.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                📊 Requisitos para Desbloquear
              </h4>

              <div className="space-y-3">
                {requirements.map((req) => {
                  const progress = Math.min((req.current / (req.required || 1)) * 100, 100);
                  const isComplete = req.current >= (req.required || 0);

                  return (
                    <div key={req.key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5">
                          <span>{req.icon}</span>
                          <span className="text-muted-foreground">{req.label}</span>
                        </span>
                        <span className={cn(
                          "font-medium flex items-center gap-1",
                          isComplete ? "text-green-500" : "text-foreground"
                        )}>
                          {req.current.toLocaleString()} / {req.required?.toLocaleString()}
                          {isComplete && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </span>
                      </div>
                      
                      <Progress 
                        value={progress} 
                        className={cn(
                          "h-2",
                          isComplete && "[&>div]:bg-green-500"
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status de desbloqueio */}
          {isUnlocked && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-500">Badge Desbloqueado!</span>
            </div>
          )}
        </div>

        {/* Footer com botão fechar */}
        <div className="p-4 pt-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className={cn(
              "w-full min-h-11",
              "bg-background/50 backdrop-blur-sm",
              "border-white/10 hover:bg-muted/80"
            )}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
