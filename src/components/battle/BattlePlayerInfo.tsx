import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PremiumAvatar } from '@/components/gamification/PremiumAvatar';
import { BattleHP } from './BattleHP';

interface BattlePlayerInfoProps {
  playerName: string;
  playerAvatar?: string;
  equippedAvatar?: {
    emoji?: string;
    imageUrl?: string;
    rarity?: string;
  };
  currentHP: number;
  maxHP: number;
  isPlayer?: boolean;
}

export const BattlePlayerInfo = ({
  playerName,
  playerAvatar,
  equippedAvatar,
  currentHP,
  maxHP,
  isPlayer = false,
}: BattlePlayerInfoProps) => {
  return (
    <div className={`flex items-center gap-2 sm:gap-3 lg:gap-4 ${isPlayer ? 'flex-row' : 'flex-row-reverse'}`}>
      {/* Avatar - Use PremiumAvatar if equipped, otherwise fallback */}
      {equippedAvatar?.emoji ? (
        <PremiumAvatar 
          emoji={equippedAvatar.emoji}
          rarity={(equippedAvatar.rarity as 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY') || 'COMMON'}
          size="md"
          imageUrl={equippedAvatar.imageUrl}
          className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16"
        />
      ) : (
        <Avatar className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 border-2 sm:border-3 lg:border-4 border-primary shadow-lg shadow-primary/50">
          <AvatarImage src={playerAvatar} alt={playerName} />
          <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm sm:text-base lg:text-xl">
            {playerName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      
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
