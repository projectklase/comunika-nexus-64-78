import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PremiumAvatar } from './PremiumAvatar';
import { cn } from '@/lib/utils';

interface RankedStudent {
  student_id: string;
  student_name: string;
  avatar: string | null;
  total_xp: number;
  koins: number;
  current_streak_days: number;
  rank_position: number;
  equipped_avatar_emoji: string | null;
  equipped_avatar_rarity: string | null;
  equipped_avatar_image_url: string | null;
}

interface RankingCardProps {
  student: RankedStudent;
  type: 'xp' | 'koins' | 'streak';
  isCurrentUser?: boolean;
  onClick?: () => void;
  prizeBadge?: number;
}

const getMedalEmoji = (position: number) => {
  if (position === 1) return '🥇';
  if (position === 2) return '🥈';
  if (position === 3) return '🥉';
  return `#${position}`;
};

const getValueByType = (student: RankedStudent, type: string) => {
  if (type === 'xp') return `${student.total_xp.toLocaleString()} XP`;
  if (type === 'koins') return `${student.koins.toLocaleString()} Koins`;
  if (type === 'streak') return `${student.current_streak_days} dias`;
  return '';
};

export function RankingCard({ student, type, isCurrentUser = false, onClick, prizeBadge }: RankingCardProps) {
  const position = student.rank_position;
  const isTopThree = position <= 3;

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg transition-all duration-200 relative',
        'hover:bg-accent/50 cursor-pointer',
        isCurrentUser && 'bg-primary/10 border border-primary/30 shadow-lg shadow-primary/10',
        isTopThree && 'bg-gradient-to-r from-amber-500/5 to-transparent'
      )}
    >
      <div className="flex items-center justify-center min-w-[40px] text-lg font-bold">
        {getMedalEmoji(position)}
      </div>
      
      {student.equipped_avatar_emoji ? (
        <PremiumAvatar 
          emoji={student.equipped_avatar_emoji}
          rarity={(student.equipped_avatar_rarity as any) || 'COMMON'}
          size="sm"
          imageUrl={student.equipped_avatar_image_url || undefined}
        />
      ) : (
        <Avatar className="h-10 w-10">
          <AvatarImage src={student.avatar || undefined} />
          <AvatarFallback className="bg-primary/10">
            {student.student_name.charAt(0)}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-medium truncate',
          isCurrentUser && 'text-primary'
        )}>
          {student.student_name}
          {isCurrentUser && ' (Você)'}
        </p>
        <p className="text-sm text-muted-foreground">
          {getValueByType(student, type)}
        </p>
      </div>

      {prizeBadge && (
        <div className="absolute bottom-1 right-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
          +{prizeBadge}
        </div>
      )}
    </div>
  );
}
