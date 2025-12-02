import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PremiumAvatar } from '@/components/gamification/PremiumAvatar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, X, Clock, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface RecentBattleCardProps {
  opponentName: string;
  opponentAvatar?: {
    emoji?: string;
    imageUrl?: string;
    rarity?: string;
  };
  isVictory: boolean | null; // null = em andamento
  myFinalHP: number;
  opponentFinalHP: number;
  xpGained: number;
  duration?: string;
  battleDate: Date;
  status: string;
  onClick?: () => void;
}

export const RecentBattleCard = ({
  opponentName,
  opponentAvatar,
  isVictory,
  myFinalHP,
  opponentFinalHP,
  xpGained,
  duration,
  battleDate,
  status,
  onClick,
}: RecentBattleCardProps) => {
  const isInProgress = status === 'IN_PROGRESS';
  const isFinished = status === 'FINISHED';

  return (
    <Card
      className={cn(
        'p-3 sm:p-4 transition-all cursor-pointer hover:scale-[1.01]',
        'bg-gradient-to-r border-l-4',
        isInProgress && 'from-blue-500/10 to-transparent border-l-blue-500 hover:from-blue-500/20',
        isFinished && isVictory && 'from-green-500/10 to-transparent border-l-green-500 hover:from-green-500/20',
        isFinished && !isVictory && 'from-red-500/10 to-transparent border-l-red-500 hover:from-red-500/20',
        !isFinished && !isInProgress && 'from-muted/30 to-transparent border-l-muted-foreground'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Avatar do oponente */}
        <div className="flex-shrink-0">
          {opponentAvatar?.emoji ? (
            <PremiumAvatar
              emoji={opponentAvatar.emoji}
              rarity={(opponentAvatar.rarity as 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY') || 'COMMON'}
              size="sm"
              imageUrl={opponentAvatar.imageUrl}
              className="w-10 h-10"
            />
          ) : (
            <Avatar className="w-10 h-10 border-2 border-primary/30">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                {opponentName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Informações principais */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">vs</span>
            <span className="font-semibold text-foreground truncate">
              {opponentName}
            </span>
          </div>
          
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className={cn(
              'font-medium',
              isVictory === true && 'text-green-500',
              isVictory === false && 'text-red-500'
            )}>
              {myFinalHP} HP
            </span>
            <span>→</span>
            <span className={cn(
              'font-medium',
              isVictory === false && 'text-green-500',
              isVictory === true && 'text-red-500'
            )}>
              {opponentFinalHP} HP
            </span>
            {duration && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {duration}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Resultado e XP */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {isInProgress ? (
            <Badge variant="default" className="bg-blue-500 text-white text-xs animate-pulse">
              ⚔️ Em Jogo
            </Badge>
          ) : isFinished ? (
            <Badge
              variant={isVictory ? 'default' : 'destructive'}
              className={cn(
                'text-xs font-bold',
                isVictory && 'bg-green-500 hover:bg-green-600'
              )}
            >
              {isVictory ? (
                <><Trophy className="w-3 h-3 mr-1" /> VITÓRIA</>
              ) : (
                <><X className="w-3 h-3 mr-1" /> DERROTA</>
              )}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              {status === 'WAITING' ? 'Aguardando' : 'Abandonada'}
            </Badge>
          )}
          
          {isFinished && (
            <span className={cn(
              'text-xs font-medium flex items-center gap-1',
              isVictory ? 'text-green-500' : 'text-muted-foreground'
            )}>
              <Zap className="w-3 h-3" />
              +{xpGained} XP
            </span>
          )}
          
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(battleDate, { addSuffix: true, locale: ptBR })}
          </span>
        </div>
      </div>
    </Card>
  );
};
