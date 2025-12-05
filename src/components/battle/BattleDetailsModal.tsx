import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { Swords, Shield, Skull, Flame, Sparkles, X, ScrollText } from 'lucide-react';

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

interface BattleDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  battleLog: BattleLogEntry[];
  player1Name: string;
  player2Name: string;
  isVictory: boolean;
}

export function BattleDetailsModal({
  open,
  onOpenChange,
  battleLog,
  player1Name,
  player2Name,
  isVictory,
}: BattleDetailsModalProps) {
  
  // Calculate statistics from battle log
  const calculateStats = () => {
    const stats = {
      player1: { damage: 0, cardsPlayed: 0, monstersDestroyed: 0, trapsActivated: 0 },
      player2: { damage: 0, cardsPlayed: 0, monstersDestroyed: 0, trapsActivated: 0 },
    };
    
    battleLog.forEach((entry) => {
      const type = entry.type || entry.action;
      const player = entry.player || entry.target;
      const isPlayer1 = player === 'player1' || player === 'PLAYER1';
      const targetStats = isPlayer1 ? stats.player1 : stats.player2;
      const opponentStats = isPlayer1 ? stats.player2 : stats.player1;
      
      switch (type) {
        case 'ATTACK':
        case 'ATTACK_MONSTER':
        case 'DIRECT_ATTACK':
          // Dano causado pelo atacante
          if (entry.attacker) {
            // No formato novo, precisamos inferir quem atacou
            // Por simplificação, contamos dano baseado no target
            const dmg = entry.damage || 0;
            if (entry.target === 'player1') stats.player2.damage += dmg;
            else if (entry.target === 'player2') stats.player1.damage += dmg;
            else targetStats.damage += dmg;
          } else {
            targetStats.damage += entry.damage || 0;
          }
          break;
        case 'PLAY_MONSTER':
        case 'PLAY_TRAP':
          targetStats.cardsPlayed++;
          break;
        case 'TRAP_ACTIVATED':
          // A trap foi ativada contra quem atacou
          opponentStats.trapsActivated++;
          break;
        case 'MONSTER_DESTROYED':
          // Precisamos saber de quem era o monstro
          opponentStats.monstersDestroyed++;
          break;
        case 'BURN_DAMAGE':
        case 'REFLECT_DAMAGE':
        case 'OVERFLOW_DAMAGE':
          if (entry.target === 'player1') stats.player2.damage += entry.damage || 0;
          else if (entry.target === 'player2') stats.player1.damage += entry.damage || 0;
          break;
      }
    });
    
    return stats;
  };
  
  const stats = calculateStats();
  
  const getPlayerName = (playerKey?: string): string => {
    if (!playerKey) return 'Jogador';
    if (playerKey === 'player1' || playerKey === 'PLAYER1') return player1Name;
    if (playerKey === 'player2' || playerKey === 'PLAYER2') return player2Name;
    return playerKey;
  };
  
  const getLogIcon = (entry: BattleLogEntry) => {
    const type = entry.type || entry.action;
    
    switch (type) {
      case 'ATTACK':
      case 'ATTACK_MONSTER':
      case 'DIRECT_ATTACK':
        return <Swords className="w-3 h-3 text-red-500" />;
      case 'PLAY_MONSTER':
        return <Sparkles className="w-3 h-3 text-blue-500" />;
      case 'PLAY_TRAP':
      case 'TRAP_ACTIVATED':
        return <Shield className="w-3 h-3 text-purple-500" />;
      case 'MONSTER_DESTROYED':
        return <Skull className="w-3 h-3 text-gray-400" />;
      case 'BURN_DOT':
      case 'BURN_DAMAGE':
        return <Flame className="w-3 h-3 text-orange-500" />;
      default:
        return <ScrollText className="w-3 h-3 text-muted-foreground" />;
    }
  };
  
  const getLogMessage = (entry: BattleLogEntry): string => {
    if (entry.message) return entry.message;
    
    const type = entry.type || entry.action;
    const playerLabel = getPlayerName(entry.player || entry.target);
    
    switch (type) {
      case 'ATTACK_MONSTER':
        return `${entry.attacker} → ${entry.defender}: ${entry.damage} dano (HP: ${entry.remainingHp})`;
      case 'DIRECT_ATTACK':
        return `${entry.attacker} atacou diretamente: ${entry.damage} dano`;
      case 'MONSTER_DESTROYED':
        return `${entry.monster} destruído!`;
      case 'TRAP_ACTIVATED':
        return `${entry.trap} ativada!`;
      case 'BURN_DOT':
      case 'BURN_DAMAGE':
        return `${entry.damage} de queimadura em ${getPlayerName(entry.target)}`;
      case 'PLAY_MONSTER':
        return `${playerLabel} invocou ${entry.card_name}`;
      case 'PLAY_TRAP':
        return `${playerLabel} colocou uma trap`;
      case 'ATTACK':
        return `${playerLabel}: ${entry.damage} dano (HP: ${entry.target_hp})`;
      default:
        return `${playerLabel} agiu`;
    }
  };

  const borderColor = isVictory ? 'border-success/50' : 'border-primary/50';
  const accentColor = isVictory ? 'text-success' : 'text-primary';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-2xl border-2 ${borderColor} bg-gradient-to-br from-background via-background to-background/95 overflow-hidden`}>
        <DialogTitle className="sr-only">Detalhes da Batalha</DialogTitle>
        <DialogDescription className="sr-only">
          Resumo estatístico e histórico completo da batalha
        </DialogDescription>
        
        <div className="relative z-10 space-y-6">
          {/* Header */}
          <div className="text-center">
            <h2 className={`text-2xl font-bold ${accentColor} mb-1`}>
              📜 Detalhes da Batalha
            </h2>
            <p className="text-sm text-muted-foreground">
              Resumo completo do duelo
            </p>
          </div>
          
          {/* Player Stats Comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Player 1 Card */}
            <motion.div 
              className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="font-bold text-center mb-3 text-primary truncate">{player1Name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Swords className="w-4 h-4 text-red-500" /> Dano
                  </span>
                  <span className="font-bold">{stats.player1.damage}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Sparkles className="w-4 h-4 text-blue-500" /> Cartas
                  </span>
                  <span className="font-bold">{stats.player1.cardsPlayed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Skull className="w-4 h-4 text-gray-400" /> Destruições
                  </span>
                  <span className="font-bold">{stats.player1.monstersDestroyed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Shield className="w-4 h-4 text-purple-500" /> Traps
                  </span>
                  <span className="font-bold">{stats.player1.trapsActivated}</span>
                </div>
              </div>
            </motion.div>
            
            {/* Player 2 Card */}
            <motion.div 
              className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="font-bold text-center mb-3 text-accent truncate">{player2Name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Swords className="w-4 h-4 text-red-500" /> Dano
                  </span>
                  <span className="font-bold">{stats.player2.damage}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Sparkles className="w-4 h-4 text-blue-500" /> Cartas
                  </span>
                  <span className="font-bold">{stats.player2.cardsPlayed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Skull className="w-4 h-4 text-gray-400" /> Destruições
                  </span>
                  <span className="font-bold">{stats.player2.monstersDestroyed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Shield className="w-4 h-4 text-purple-500" /> Traps
                  </span>
                  <span className="font-bold">{stats.player2.trapsActivated}</span>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* VS Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-xs font-bold text-muted-foreground">TIMELINE DA BATALHA</span>
            <div className="flex-1 h-px bg-border/50" />
          </div>
          
          {/* Battle Timeline */}
          <ScrollArea className="h-[200px] pr-4">
            <div className="space-y-1.5">
              {battleLog.map((entry, index) => (
                <motion.div
                  key={`${entry.logged_at || entry.timestamp}-${index}`}
                  className="flex items-center gap-2 p-2 rounded-lg bg-background/30 border border-border/20 text-xs"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.02 }}
                >
                  <span className="flex-shrink-0">{getLogIcon(entry)}</span>
                  <span className="text-foreground/80 flex-1">{getLogMessage(entry)}</span>
                </motion.div>
              ))}
              
              {battleLog.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Nenhuma ação registrada
                </p>
              )}
            </div>
          </ScrollArea>
          
          {/* Close Button */}
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
