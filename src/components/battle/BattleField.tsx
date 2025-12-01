import { motion } from 'framer-motion';
import { BattleCard } from './BattleCard';
import { TrapCard } from './TrapCard';
import { Card } from '@/types/cards';

interface FieldMonster {
  id: string;
  name: string;
  atk: number;
  def: number;
  effects: any[];
}

interface FieldTrap {
  id: string;
  name: string;
  effects: any[];
  is_facedown: boolean;
}

interface BattleFieldProps {
  monster?: FieldMonster | null;
  traps?: FieldTrap[];
  isOpponent?: boolean;
}

export const BattleField = ({ monster, traps = [], isOpponent }: BattleFieldProps) => {
  return (
    <motion.div
      className={`flex ${isOpponent ? 'flex-row-reverse' : 'flex-row'} items-center justify-between gap-4 p-6 bg-gradient-to-br from-background/30 to-background/50 backdrop-blur-sm rounded-2xl border-2 ${
        isOpponent ? 'border-red-500/30' : 'border-blue-500/30'
      } shadow-xl min-h-[180px]`}
      initial={{ opacity: 0, y: isOpponent ? -20 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Monster Zone */}
      <div className="flex-1 flex items-center justify-center">
        {monster ? (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.6 }}
          >
            <BattleCard
              card={monster as any}
              isSelected={false}
              isSelectable={false}
            />
          </motion.div>
        ) : (
          <div className="w-32 h-44 border-2 border-dashed border-muted-foreground/30 rounded-xl flex items-center justify-center">
            <span className="text-xs text-muted-foreground">
              {isOpponent ? 'Monstro Inimigo' : 'Seu Monstro'}
            </span>
          </div>
        )}
      </div>

      {/* Trap Zone */}
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground text-center">
          {isOpponent ? 'Traps Inimigas' : 'Suas Traps'}
        </span>
        <div className="flex gap-2">
          {traps.map((trap, index) => (
            <motion.div
              key={trap.id}
              initial={{ scale: 0, rotate: 90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: index * 0.1, type: 'spring' }}
            >
              <TrapCard
                isFacedown={trap.is_facedown}
                trapName={trap.name}
              />
            </motion.div>
          ))}
          {traps.length === 0 && (
            <div className="w-20 h-28 border-2 border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground text-center">Sem traps</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
