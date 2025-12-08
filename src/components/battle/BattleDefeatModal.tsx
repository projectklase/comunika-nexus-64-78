import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Star, BookOpen, Swords, ScrollText } from 'lucide-react';
import { useEffect, useState } from 'react';
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

interface BattleDefeatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  xpGained: number;
  stats: {
    roundsWon: number;
    roundsLost: number;
    cardsPlayed: number;
  };
  onTryAgain: () => void;
  battleLog?: BattleLogEntry[];
  player1Name?: string;
  player2Name?: string;
}

const motivationalTips = [
  'Tente balancear cartas de ATK e DEF no seu deck!',
  'Observe quais linhas o oponente está focando.',
  'Cartas de efeito podem mudar o jogo no momento certo!',
  'Nem sempre a carta mais forte é a melhor escolha.',
  'Analise o deck do oponente e adapte sua estratégia.',
];

export function BattleDefeatModal({
  open,
  onOpenChange,
  xpGained,
  stats,
  onTryAgain,
  battleLog = [],
  player1Name = 'Jogador 1',
  player2Name = 'Jogador 2',
}: BattleDefeatModalProps) {
  const [displayXP, setDisplayXP] = useState(0);
  const [tip, setTip] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    if (open) {
      // Select random tip
      setTip(motivationalTips[Math.floor(Math.random() * motivationalTips.length)]);

      // Animate XP counter
      const xpTimer = setTimeout(() => {
        let current = 0;
        const increment = xpGained / 20;
        const interval = setInterval(() => {
          current += increment;
          if (current >= xpGained) {
            setDisplayXP(xpGained);
            clearInterval(interval);
          } else {
            setDisplayXP(Math.floor(current));
          }
        }, 40);

        return () => clearInterval(interval);
      }, 800);

      // Subtle particle effect (no confetti)
      const particleTimer = setTimeout(() => {
        createSubtleParticles();
      }, 500);

      return () => {
        clearTimeout(xpTimer);
        clearTimeout(particleTimer);
      };
    } else {
      setDisplayXP(0);
    }
  }, [open, xpGained]);

  const createSubtleParticles = () => {
    for (let i = 0; i < 5; i++) {
      const particle = document.createElement('div');
      particle.className = 'absolute w-2 h-2 rounded-full bg-primary/40 pointer-events-none';
      particle.style.left = `${20 + Math.random() * 60}%`;
      particle.style.top = '80%';
      document.body.appendChild(particle);

      const animation = particle.animate([
        { transform: 'translateY(0) scale(1)', opacity: 0.6 },
        { transform: `translateY(-200px) translateX(${Math.random() * 40 - 20}px) scale(0.5)`, opacity: 0 }
      ], {
        duration: 2000 + Math.random() * 1000,
        easing: 'ease-out'
      });

      animation.onfinish = () => particle.remove();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-24px)] sm:max-w-lg mx-3 sm:mx-auto max-h-[90vh] overflow-y-auto border-2 border-primary/30 bg-gradient-to-br from-background via-primary/5 to-background overflow-hidden">
          <DialogTitle className="sr-only">Derrota na Batalha</DialogTitle>
          <DialogDescription className="sr-only">
            Você foi derrotado, mas ganhou XP de participação
          </DialogDescription>
          <AnimatePresence>
            {open && (
              <>
                {/* Subtle background gradient */}
                <motion.div
                  className="absolute inset-0 opacity-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.05 }}
                  transition={{ duration: 1 }}
                  style={{
                    background: 'radial-gradient(circle at 50% 50%, hsl(var(--primary)) 0%, transparent 70%)',
                  }}
                />

                {/* Content */}
                <motion.div
                  className="relative z-10 text-center space-y-4 sm:space-y-6 py-2 sm:py-4 px-1 sm:px-0"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {/* Shield Icon */}
                  <motion.div
                    className="mx-auto w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-primary/10 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
                  >
                    <Shield className="w-8 h-8 sm:w-12 sm:h-12 text-primary" />
                  </motion.div>

                  {/* Defeat Title */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <h2 className="text-2xl sm:text-4xl font-bold text-primary mb-1 sm:mb-2">
                      DERROTA
                    </h2>
                    <p className="text-muted-foreground text-sm sm:text-lg">
                      Você jogou bem! Continue praticando.
                    </p>
                  </motion.div>

                  {/* Stats Grid */}
                  <motion.div
                    className="grid grid-cols-3 gap-2 sm:gap-4 py-2 sm:py-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    <div className="bg-background/50 backdrop-blur-sm rounded-lg p-2 sm:p-4 border border-border/50">
                      <Swords className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2 text-muted-foreground" />
                      <p className="text-xl sm:text-2xl font-bold">{stats.roundsWon}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Rounds Vencidos</p>
                    </div>
                    <div className="bg-background/50 backdrop-blur-sm rounded-lg p-2 sm:p-4 border border-border/50">
                      <Star className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2 text-primary" />
                      <p className="text-xl sm:text-2xl font-bold">{stats.cardsPlayed}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Cartas Jogadas</p>
                    </div>
                    <div className="bg-background/50 backdrop-blur-sm rounded-lg p-2 sm:p-4 border border-border/50">
                      <Shield className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2 text-accent" />
                      <p className="text-xl sm:text-2xl font-bold">{stats.roundsWon}-{stats.roundsLost}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Placar Final</p>
                    </div>
                  </motion.div>

                  {/* XP Consolation */}
                  <motion.div
                    className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl p-3 sm:p-6 border border-primary/20"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 1, type: 'spring', stiffness: 150 }}
                  >
                    <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 text-primary" />
                    <p className="text-muted-foreground text-xs sm:text-sm mb-1 sm:mb-2">XP de Participação</p>
                    <motion.p
                      className="text-3xl sm:text-5xl font-bold text-primary"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ delay: 1.3, duration: 0.4 }}
                    >
                      +{displayXP}
                    </motion.p>
                  </motion.div>

                  {/* Motivational Tip */}
                  <motion.div
                    className="bg-accent/5 rounded-lg p-2 sm:p-4 border border-accent/20"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.5 }}
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 text-sm sm:text-base">
                        💡
                      </div>
                      <p className="text-xs sm:text-sm text-foreground/80 text-left">
                        <span className="font-semibold text-accent">Dica:</span> {tip}
                      </p>
                    </div>
                  </motion.div>

                  {/* Action Buttons */}
                  <motion.div
                    className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-center justify-center w-full pt-2 sm:pt-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.7 }}
                  >
                    <Button
                      variant="outline"
                      onClick={() => setShowDetailsModal(true)}
                      className="w-full sm:w-auto sm:min-w-[140px] border-primary/50 hover:bg-primary/10 text-sm"
                    >
                      <ScrollText className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </Button>
                    <Button
                      onClick={onTryAgain}
                      className="w-full sm:w-auto sm:min-w-[160px] bg-primary hover:bg-primary/80 text-sm"
                    >
                      <Swords className="w-4 h-4 mr-2" />
                      Tentar Novamente
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
        isVictory={false}
      />
    </>
  );
}