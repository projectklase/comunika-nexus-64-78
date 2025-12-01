import { motion, AnimatePresence } from 'framer-motion';
import { Scroll, Swords, Shield, Zap } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LogEntry {
  action: string;
  player: string;
  card_name?: string;
  damage?: number;
  target_hp?: number;
  timestamp: string;
}

interface BattleLogProps {
  logs: LogEntry[];
}

export const BattleLog = ({ logs }: BattleLogProps) => {
  const getLogIcon = (action: string) => {
    switch (action) {
      case 'ATTACK':
        return <Swords className="w-4 h-4 text-red-500" />;
      case 'PLAY_MONSTER':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'PLAY_TRAP':
        return <Zap className="w-4 h-4 text-purple-500" />;
      default:
        return <Scroll className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getLogMessage = (log: LogEntry) => {
    const playerLabel = log.player === 'player1' ? 'Jogador 1' : 'Jogador 2';
    
    switch (log.action) {
      case 'ATTACK':
        return `${playerLabel} atacou causando ${log.damage} de dano! HP restante: ${log.target_hp}`;
      case 'PLAY_MONSTER':
        return `${playerLabel} jogou ${log.card_name} em campo!`;
      case 'PLAY_TRAP':
        return `${playerLabel} colocou uma trap virada!`;
      default:
        return `${playerLabel} realizou uma ação`;
    }
  };

  return (
    <div className="bg-background/40 backdrop-blur-sm rounded-xl border border-border/50 p-4 h-full">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/30">
        <Scroll className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-sm text-foreground">Histórico da Batalha</h3>
      </div>
      
      <ScrollArea className="h-[calc(100%-3rem)]">
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {logs.slice().reverse().map((log, index) => (
              <motion.div
                key={`${log.timestamp}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="flex items-start gap-2 p-2 bg-background/30 rounded-lg border border-border/20"
              >
                <div className="mt-0.5">{getLogIcon(log.action)}</div>
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
