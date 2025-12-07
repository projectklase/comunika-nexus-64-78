import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, TrendingUp, Swords, ScrollText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { celebrateLegendary } from '@/utils/celebration-effects';
import { BattleDetailsModal } from './BattleDetailsModal';

interface BattleLogEntry {
  action?: string;
  card_name?: string;
  player?: string;
  timestamp?: string;
  damage?: number;
  target_hp?: number;
  type?: string;
  logged_at?: string;
  attacker?: string;
  defender?: string;
  remainingHp?: number;
  monster?: string;
  trap?: string;
  effect?: string;
  value?: number;
  target?: string;
  message?: string;
}

interface BattleVictoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  xpGained: number;
  streakBonus?: number;
  stats: {
    roundsWon: number;
    roundsLost: number;
    cardsPlayed: number;
  };
  onPlayAgain: () => void;
  battleLog?: BattleLogEntry[];
  player1Name?: string;
  player2Name?: string;
}

export function BattleVictoryModal({
  open,
  onOpenChange,
  xpGained,
  streakBonus = 0,
  stats,
  onPlayAgain,
  battleLog = [],
  player1Name = 'Jogador 1',
  player2Name = 'Jogador 2',
}: BattleVictoryModalProps) {
  const [displayXP, setDisplayXP] = useState(0);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const totalXP = xpGained + streakBonus;

  useEffect(() => {
    if (open) {
      // Trigger confetti after modal appears
      const confettiTimer = setTimeout(() => {
        celebrateLegendary();
      }, 500);

      // Animate XP counter
      const xpTimer = setTimeout(() => {
        let current = 0;
        const increment = totalXP / 30;
        const interval = setInterval(() => {
          current += increment;
          if (current >= totalXP) {
            setDisplayXP(totalXP);
            clearInterval(interval);
          } else {
            setDisplayXP(Math.floor(current));
          }
        }, 30);

        return () => clearInterval(interval);
      }, 1000);

      return () => {
        clearTimeout(confettiTimer);
        clearTimeout(xpTimer);
      };
    } else {
      setDisplayXP(0);
    }
  }, [open, totalXP]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-24px)] sm:max-w-lg mx-3 sm:mx-auto max-h-[90vh] overflow-y-auto border-2 border-success/50 bg-gradient-to-br from-background via-success/5 to-background overflow-hidden">
          <DialogTitle className="sr-only">Vitória na Batalha</DialogTitle>
          <DialogDescription className="sr-only">
            Você venceu a batalha e ganhou XP
          </DialogDescription>
          <AnimatePresence>
            {open && (
              <>
                {/* Golden rays background effect */}
                <motion.div
                  className="absolute inset-0 opacity-10"
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  style={{
                    background: 'conic-gradient(from 0deg, transparent 60%, hsl(var(--success)) 70%, transparent 80%)',
                  }}
                />

                {/* Content */}
                <motion.div
                  className="relative z-10 text-center space-y-4 sm:space-y-6 py-2 sm:py-4 px-1 sm:px-0"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                >
                  {/* Trophy Icon */}
                  <motion.div
                    className="mx-auto w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-success/20 flex items-center justify-center"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 100 }}
                  >
                    <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-success" />
                  </motion.div>

                  {/* Victory Title */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <h2 className="text-3xl sm:text-5xl font-bold text-success mb-1 sm:mb-2">
                      VITÓRIA!
                    </h2>
                    <p className="text-muted-foreground text-sm sm:text-lg">
                      Você dominou a arena!
                    </p>
                  </motion.div>

                  {/* Stats Grid */}
                  <motion.div
                    className="grid grid-cols-3 gap-2 sm:gap-4 py-2 sm:py-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                  >
                    <div className="bg-background/50 backdrop-blur-sm rounded-lg p-2 sm:p-4 border border-border/50">
                      <Swords className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2 text-success" />
                      <p className="text-xl sm:text-2xl font-bold text-success">{stats.roundsWon}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Rounds Vencidos</p>
                    </div>
                    <div className="bg-background/50 backdrop-blur-sm rounded-lg p-2 sm:p-4 border border-border/50">
                      <Star className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2 text-primary" />
                      <p className="text-xl sm:text-2xl font-bold">{stats.cardsPlayed}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Cartas Jogadas</p>
                    </div>
                    <div className="bg-background/50 backdrop-blur-sm rounded-lg p-2 sm:p-4 border border-border/50">
                      <Trophy className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2 text-accent" />
                      <p className="text-xl sm:text-2xl font-bold">{stats.roundsWon}-{stats.roundsLost}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Placar Final</p>
                    </div>
                  </motion.div>

                  {/* XP Rewards */}
                  <motion.div
                    className="bg-gradient-to-r from-primary/10 via-success/20 to-primary/10 rounded-xl p-3 sm:p-6 border-2 border-success/30"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 1.5, type: 'spring', stiffness: 150 }}
                  >
                    <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 text-success" />
                    <p className="text-muted-foreground text-xs sm:text-sm mb-1 sm:mb-2">XP Ganho</p>
                    <motion.p
                      className="text-4xl sm:text-6xl font-bold text-success"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ delay: 1.8, duration: 0.5 }}
                    >
                      +{displayXP}
                    </motion.p>
                    {streakBonus > 0 && (
                      <motion.p
                        className="text-xs sm:text-sm text-primary mt-1 sm:mt-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2 }}
                      >
                        🔥 Bônus de Streak: +{streakBonus} XP
                      </motion.p>
                    )}
                  </motion.div>

                  {/* Action Buttons */}
                  <motion.div
                    className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-center sm:justify-center w-full pt-2 sm:pt-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.2 }}
                  >
                    <Button
                      variant="outline"
                      onClick={() => setShowDetailsModal(true)}
                      className="w-full sm:w-auto border-success/50 hover:bg-success/10 text-sm"
                    >
                      <ScrollText className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </Button>
                    <Button
                      onClick={onPlayAgain}
                      className="w-full sm:w-auto bg-success hover:bg-success/80 text-sm"
                    >
                      <Swords className="w-4 h-4 mr-2" />
                      Jogar Novamente
                    </Button>
                  </motion.div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="w-full sm:w-auto text-muted-foreground hover:text-foreground text-xs sm:text-sm"
                  >
                    Fechar
                  </Button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
      
      <BattleDetailsModal
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
        battleLog={battleLog}
        player1Name={player1Name}
        player2Name={player2Name}
        isVictory={true}
      />
    </>
  );
}