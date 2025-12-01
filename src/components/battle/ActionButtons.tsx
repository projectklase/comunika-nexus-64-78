import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Swords, Hand, ArrowRight } from 'lucide-react';

interface ActionButtonsProps {
  canPlayCard: boolean;
  canAttack: boolean;
  isMyTurn: boolean;
  onPlayCard: () => void;
  onAttack: () => void;
  onEndTurn: () => void;
}

export const ActionButtons = ({
  canPlayCard,
  canAttack,
  isMyTurn,
  onPlayCard,
  onAttack,
  onEndTurn,
}: ActionButtonsProps) => {
  if (!isMyTurn) {
    return (
      <div className="flex items-center justify-center p-4 bg-muted/20 rounded-xl border border-border/30">
        <p className="text-sm text-muted-foreground">Aguardando turno do oponente...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Button
        onClick={onPlayCard}
        disabled={!canPlayCard}
        className="flex-1 gap-2"
        variant={canPlayCard ? 'default' : 'outline'}
      >
        <Hand className="w-4 h-4" />
        Jogar Carta
      </Button>

      <Button
        onClick={onAttack}
        disabled={!canAttack}
        className="flex-1 gap-2"
        variant={canAttack ? 'destructive' : 'outline'}
      >
        <Swords className="w-4 h-4" />
        Atacar
      </Button>

      <Button
        onClick={onEndTurn}
        className="flex-1 gap-2"
        variant="secondary"
      >
        <ArrowRight className="w-4 h-4" />
        Passar Turno
      </Button>
    </motion.div>
  );
};
