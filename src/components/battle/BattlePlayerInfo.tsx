import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BattleHP } from './BattleHP';

interface BattlePlayerInfoProps {
  playerName: string;
  playerAvatar?: string;
  currentHP: number;
  maxHP: number;
  isPlayer?: boolean;
}

export const BattlePlayerInfo = ({
  playerName,
  playerAvatar,
  currentHP,
  maxHP,
  isPlayer = false,
}: BattlePlayerInfoProps) => {
  return (
    <div className={`flex items-center gap-2 sm:gap-3 lg:gap-4 ${isPlayer ? 'flex-row' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <Avatar className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 border-2 sm:border-3 lg:border-4 border-primary shadow-lg shadow-primary/50">
        <AvatarImage src={playerAvatar} alt={playerName} />
        <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm sm:text-base lg:text-xl">
          {playerName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      {/* HP Bar */}
      <BattleHP
        currentHP={currentHP}
        maxHP={maxHP}
        playerName={playerName}
        isPlayer={isPlayer}
      />
    </div>
  );
};
