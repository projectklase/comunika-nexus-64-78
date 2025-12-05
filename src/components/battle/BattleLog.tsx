import { motion, AnimatePresence } from 'framer-motion';
import { Scroll, Swords, Shield, Zap, X, Flame, Heart, Snowflake, Skull, Target, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface BattleLogEntry {
  // Format antigo (play_card RPC)
  action?: string;
  card_name?: string;
  player?: string;
  timestamp?: string;
  damage?: number;
  target_hp?: number;
  
  // Format novo (attack RPC)
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
  duration?: number;
  cause?: string;
}

interface BattleLogProps {
  logs: BattleLogEntry[];
  player1Name?: string;
  player2Name?: string;
  onClose?: () => void;
}

export const BattleLog = ({ logs, player1Name = 'Jogador 1', player2Name = 'Jogador 2', onClose }: BattleLogProps) => {
  
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
        return <Swords className="w-4 h-4 text-red-500" />;
      case 'PLAY_MONSTER':
        return <Sparkles className="w-4 h-4 text-blue-500" />;
      case 'PLAY_TRAP':
        return <Shield className="w-4 h-4 text-purple-500" />;
      case 'TRAP_ACTIVATED':
        return <Zap className="w-4 h-4 text-purple-400" />;
      case 'MONSTER_DESTROYED':
        return <Skull className="w-4 h-4 text-gray-400" />;
      case 'BURN_DOT':
      case 'BURN_DAMAGE':
        return <Flame className="w-4 h-4 text-orange-500" />;
      case 'HEAL':
        return <Heart className="w-4 h-4 text-green-500" />;
      case 'FREEZE_APPLIED':
      case 'FROZEN_SKIP':
        return <Snowflake className="w-4 h-4 text-cyan-400" />;
      case 'REFLECT_DAMAGE':
        return <Target className="w-4 h-4 text-yellow-500" />;
      case 'OVERFLOW_DAMAGE':
        return <Swords className="w-4 h-4 text-red-600" />;
      default:
        return <Scroll className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getLogMessage = (entry: BattleLogEntry): string => {
    // Se tem message pré-formatada (novo formato), usar ela
    if (entry.message) {
      return entry.message;
    }
    
    const type = entry.type || entry.action;
    const playerLabel = getPlayerName(entry.player || entry.target);
    
    switch (type) {
      // Formato novo (attack RPC)
      case 'ATTACK_MONSTER':
        return `⚔️ ${entry.attacker} atacou ${entry.defender} causando ${entry.damage} dano! HP: ${entry.remainingHp}`;
      
      case 'DIRECT_ATTACK':
        return `⚡ ${entry.attacker} atacou diretamente! ${entry.damage} de dano ao ${getPlayerName(entry.target)}`;
      
      case 'MONSTER_DESTROYED':
        return `💀 ${entry.monster} foi destruído${entry.cause ? ` por ${entry.cause}` : ''}!`;
      
      case 'TRAP_ACTIVATED':
        return `🛡️ ${entry.trap} ativada! Efeito: ${entry.effect}${entry.value ? ` (${entry.value})` : ''}`;
      
      case 'BURN_DOT':
        return `🔥 ${entry.target} sofreu ${entry.damage} de queimadura!`;
      
      case 'BURN_DAMAGE':
        return `🔥 ${getPlayerName(entry.target)} recebeu ${entry.damage} de dano por BURN!`;
      
      case 'HEAL':
        return `💚 ${entry.monster} recuperou ${entry.value} HP!`;
      
      case 'FREEZE_APPLIED':
        return `❄️ ${entry.target} foi congelado!`;
      
      case 'FROZEN_SKIP':
        return `❄️ ${entry.attacker} está congelado e não pôde atacar!`;
      
      case 'REFLECT_DAMAGE':
        return `🪞 ${entry.damage} de dano refletido ao ${getPlayerName(entry.target)}!`;
      
      case 'OVERFLOW_DAMAGE':
        return `💥 ${Math.abs(entry.damage || 0)} de dano excedente ao ${getPlayerName(entry.target)}!`;
      
      // Formato antigo (play_card RPC)
      case 'ATTACK':
        return `⚔️ ${playerLabel} atacou causando ${entry.damage} de dano! HP: ${entry.target_hp}`;
      
      case 'PLAY_MONSTER':
        return `🃏 ${playerLabel} invocou ${entry.card_name}!`;
      
      case 'PLAY_TRAP':
        return `🎭 ${playerLabel} colocou uma trap virada!`;
      
      default:
        return `${playerLabel} realizou uma ação`;
    }
  };

  const getEntryColor = (entry: BattleLogEntry): string => {
    const type = entry.type || entry.action;
    
    switch (type) {
      case 'ATTACK':
      case 'ATTACK_MONSTER':
      case 'DIRECT_ATTACK':
      case 'OVERFLOW_DAMAGE':
        return 'border-red-500/30 bg-red-500/5';
      case 'TRAP_ACTIVATED':
        return 'border-purple-500/30 bg-purple-500/5';
      case 'MONSTER_DESTROYED':
        return 'border-gray-500/30 bg-gray-500/5';
      case 'BURN_DOT':
      case 'BURN_DAMAGE':
        return 'border-orange-500/30 bg-orange-500/5';
      case 'HEAL':
        return 'border-green-500/30 bg-green-500/5';
      case 'FREEZE_APPLIED':
      case 'FROZEN_SKIP':
        return 'border-cyan-500/30 bg-cyan-500/5';
      case 'PLAY_MONSTER':
        return 'border-blue-500/30 bg-blue-500/5';
      case 'PLAY_TRAP':
        return 'border-purple-500/30 bg-purple-500/5';
      default:
        return 'border-border/20 bg-background/30';
    }
  };

  return (
    <div className="bg-background/40 backdrop-blur-sm rounded-xl border border-border/50 p-4 h-full">
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Scroll className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-sm text-foreground">Histórico da Batalha</h3>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <ScrollArea className="h-[calc(100%-3rem)]">
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {logs.slice().reverse().map((log, index) => (
              <motion.div
                key={`${log.logged_at || log.timestamp}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className={`flex items-start gap-2 p-2 rounded-lg border ${getEntryColor(log)}`}
              >
                <div className="mt-0.5 flex-shrink-0">{getLogIcon(log)}</div>
                <p className="text-xs text-foreground/80 leading-relaxed flex-1">
                  {getLogMessage(log)}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {logs.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              Nenhuma ação ainda...
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
