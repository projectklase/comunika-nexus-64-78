import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Trophy, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Winner {
  user_id: string;
  name: string;
  avatar: string | null;
  equipped_avatar: {
    emoji?: string;
    imageUrl?: string;
  } | null;
  total_xp: number;
  position: number;
  prize_xp: number;
}

interface WeeklyPrizeCelebrationModalProps {
  open: boolean;
  winners: Winner[];
  myPosition: number;
  myPrize: number;
  onClose: () => void;
}

const MEDAL_STYLES = {
  1: {
    size: 'w-20 h-20',
    ring: 'ring-4 ring-amber-400 shadow-lg shadow-amber-400/50',
    bg: 'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500',
    medal: '🥇',
    label: 'Campeão',
    textColor: 'text-amber-900',
    podiumHeight: 'h-28',
  },
  2: {
    size: 'w-16 h-16',
    ring: 'ring-4 ring-slate-300 shadow-lg shadow-slate-300/50',
    bg: 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400',
    medal: '🥈',
    label: 'Vice',
    textColor: 'text-slate-700',
    podiumHeight: 'h-20',
  },
  3: {
    size: 'w-14 h-14',
    ring: 'ring-4 ring-amber-600 shadow-lg shadow-amber-600/50',
    bg: 'bg-gradient-to-br from-amber-600 via-orange-500 to-amber-700',
    medal: '🥉',
    label: 'Bronze',
    textColor: 'text-amber-800',
    podiumHeight: 'h-16',
  },
};

function WinnerAvatar({ winner }: { winner: Winner }) {
  const style = MEDAL_STYLES[winner.position as 1 | 2 | 3];
  
  // Check for equipped avatar
  const hasEquippedEmoji = winner.equipped_avatar?.emoji;
  const hasEquippedImage = winner.equipped_avatar?.imageUrl;
  
  return (
    <div className={cn('rounded-full flex items-center justify-center', style.size, style.ring, style.bg)}>
      {hasEquippedEmoji ? (
        <span className={cn(
          winner.position === 1 ? 'text-4xl' : winner.position === 2 ? 'text-3xl' : 'text-2xl'
        )}>
          {winner.equipped_avatar?.emoji}
        </span>
      ) : hasEquippedImage ? (
        <Avatar className={cn(style.size, 'border-2 border-white/50')}>
          <AvatarImage src={winner.equipped_avatar?.imageUrl} alt={winner.name} />
          <AvatarFallback className="bg-primary/20 text-primary font-bold">
            {winner.name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : winner.avatar ? (
        <Avatar className={cn(style.size, 'border-2 border-white/50')}>
          <AvatarImage src={winner.avatar} alt={winner.name} />
          <AvatarFallback className="bg-primary/20 text-primary font-bold">
            {winner.name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <span className={cn(
          'font-bold text-white',
          winner.position === 1 ? 'text-2xl' : winner.position === 2 ? 'text-xl' : 'text-lg'
        )}>
          {winner.name?.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function PodiumWinner({ winner, delay }: { winner: Winner; delay: number }) {
  const style = MEDAL_STYLES[winner.position as 1 | 2 | 3];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, type: 'spring' }}
      className="flex flex-col items-center"
    >
      {/* Medal */}
      <span className="text-2xl mb-1">{style.medal}</span>
      
      {/* Avatar */}
      <WinnerAvatar winner={winner} />
      
      {/* Name */}
      <p className={cn(
        'font-bold mt-2 text-center line-clamp-1 max-w-[100px]',
        winner.position === 1 ? 'text-sm' : 'text-xs',
        'text-foreground'
      )}>
        {winner.name?.split(' ')[0]}
      </p>
      
      {/* Prize badge */}
      <div className={cn(
        'mt-1 px-2 py-0.5 rounded-full font-bold',
        winner.position === 1 
          ? 'bg-amber-500 text-white text-sm' 
          : winner.position === 2 
            ? 'bg-slate-400 text-white text-xs'
            : 'bg-amber-600 text-white text-xs'
      )}>
        +{winner.prize_xp} XP
      </div>
      
      {/* Podium */}
      <div className={cn(
        'w-20 mt-2 rounded-t-lg',
        style.podiumHeight,
        winner.position === 1 
          ? 'bg-gradient-to-b from-amber-400 to-amber-600' 
          : winner.position === 2 
            ? 'bg-gradient-to-b from-slate-300 to-slate-500'
            : 'bg-gradient-to-b from-amber-500 to-amber-700'
      )}>
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-white font-bold text-lg">{winner.position}º</span>
        </div>
      </div>
    </motion.div>
  );
}

export function WeeklyPrizeCelebrationModal({
  open,
  winners,
  myPosition,
  myPrize,
  onClose
}: WeeklyPrizeCelebrationModalProps) {
  const top3 = winners.filter(w => w.position <= 3);
  const others = winners.filter(w => w.position > 3);
  
  // Reorganize for podium layout: 2nd, 1st, 3rd
  const podiumOrder = [
    top3.find(w => w.position === 2),
    top3.find(w => w.position === 1),
    top3.find(w => w.position === 3),
  ].filter(Boolean) as Winner[];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative rounded-2xl overflow-hidden"
            >
              {/* Golden gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600" />
              
              {/* Sparkle overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.3)_0%,transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.2)_0%,transparent_40%)]" />
              
              {/* Content */}
              <div className="relative z-10 p-6">
                {/* Header */}
                <motion.div 
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-center mb-6"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="w-6 h-6 text-white animate-pulse" />
                    <Trophy className="w-12 h-12 text-white drop-shadow-lg" />
                    <Sparkles className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-bold text-white drop-shadow-md">
                    Campeões da Semana!
                  </h2>
                  <p className="text-amber-100 text-sm mt-1">
                    Parabéns aos melhores competidores
                  </p>
                </motion.div>

                {/* Podium */}
                <div className="flex items-end justify-center gap-2 mb-4">
                  {podiumOrder.map((winner, idx) => (
                    <PodiumWinner 
                      key={winner.user_id} 
                      winner={winner} 
                      delay={0.3 + idx * 0.15}
                    />
                  ))}
                </div>

                {/* Other winners */}
                {others.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="bg-white/20 backdrop-blur-sm rounded-xl p-3 mb-4"
                  >
                    <p className="text-xs text-white/80 text-center mb-2 font-medium">
                      Outros Premiados
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {others.map((winner) => (
                        <div 
                          key={winner.user_id}
                          className="flex items-center gap-1.5 bg-white/30 rounded-full px-2 py-1"
                        >
                          <span className="text-xs text-white/90">{winner.position}º</span>
                          <span className="text-xs font-medium text-white truncate max-w-[60px]">
                            {winner.name?.split(' ')[0]}
                          </span>
                          <span className="text-xs font-bold text-amber-200">
                            +{winner.prize_xp}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Personal message */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-center mb-4"
                >
                  {myPosition > 0 && myPosition <= 10 ? (
                    <div className="bg-white/30 backdrop-blur-sm rounded-xl p-3">
                      <div className="flex items-center justify-center gap-2">
                        <Star className="w-5 h-5 text-white fill-white" />
                        <span className="text-white font-bold">
                          Parabéns! Você ficou em {myPosition}º lugar!
                        </span>
                        <Star className="w-5 h-5 text-white fill-white" />
                      </div>
                      <p className="text-amber-100 text-sm mt-1">
                        Você ganhou <span className="font-bold text-white">+{myPrize} XP</span> de bônus!
                      </p>
                    </div>
                  ) : (
                    <p className="text-white/90 text-sm">
                      Continue competindo! Na próxima semana pode ser você! 💪
                    </p>
                  )}
                </motion.div>

                {/* Close button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                >
                  <Button
                    onClick={onClose}
                    className="w-full bg-white text-amber-600 hover:bg-white/90 font-bold shadow-lg"
                  >
                    Continuar
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
