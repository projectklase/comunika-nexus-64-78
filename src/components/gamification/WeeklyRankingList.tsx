import { ScrollArea } from '@/components/ui/scroll-area';
import { RankingCard } from './RankingCard';
import { Loader2, Trophy, Clock } from 'lucide-react';
import { useMemo } from 'react';

interface WeeklyRankedStudent {
  student_id: string;
  student_name: string;
  avatar: string | null;
  weekly_xp: number;
  rank_position: number;
  equipped_avatar_emoji: string | null;
  equipped_avatar_rarity: string | null;
  equipped_avatar_image_url: string | null;
}

interface WeeklyRankingListProps {
  students: WeeklyRankedStudent[];
  currentUserId?: string;
  isLoading?: boolean;
  onStudentClick?: (studentId: string) => void;
}

// Calcula dias até domingo 23:59
function getDaysUntilPrize(): { days: number; hours: number } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = domingo
  
  // Dias até domingo
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  
  // Criar data do próximo domingo às 23:59
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(23, 59, 59, 999);
  
  const diff = nextSunday.getTime() - now.getTime();
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  return { days: daysUntilSunday, hours };
}

// Prêmios por posição
const PRIZES = [800, 500, 350, 100, 50, 25, 25, 25, 25, 25];

export function WeeklyRankingList({ 
  students, 
  currentUserId, 
  isLoading, 
  onStudentClick 
}: WeeklyRankingListProps) {
  const timeUntilPrize = useMemo(() => getDaysUntilPrize(), []);
  
  // Adaptar dados para o RankingCard existente
  const adaptedStudents = students.map(s => ({
    student_id: s.student_id,
    student_name: s.student_name,
    avatar: s.avatar,
    total_xp: Number(s.weekly_xp),
    koins: 0,
    current_streak_days: 0,
    rank_position: Number(s.rank_position),
    equipped_avatar_emoji: s.equipped_avatar_emoji,
    equipped_avatar_rarity: s.equipped_avatar_rarity,
    equipped_avatar_image_url: s.equipped_avatar_image_url
  }));

  return (
    <div className="bg-gradient-to-br from-amber-500/10 via-background/60 to-orange-500/10 backdrop-blur-md border border-amber-500/30 rounded-xl p-4 shadow-lg">
      {/* Header especial */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          <h3 className="text-lg font-bold">Top XP Semanal</h3>
        </div>
        
        {/* Countdown */}
        <div className="flex items-center gap-1.5 text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
          <Clock className="h-3 w-3" />
          <span>
            {timeUntilPrize.days > 0 
              ? `${timeUntilPrize.days}d ${timeUntilPrize.hours}h`
              : `${timeUntilPrize.hours}h`
            }
          </span>
        </div>
      </div>
      
      {/* Info sobre prêmios */}
      <div className="mb-3 px-2 py-1.5 bg-background/40 rounded-lg">
        <p className="text-xs text-muted-foreground text-center">
          🏆 Top 10 ganham XP bônus no domingo!
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhuma atividade esta semana</p>
          <p className="text-xs mt-1">Complete desafios e batalhas para entrar no ranking!</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2 pt-3">
            {adaptedStudents.map((student, index) => (
              <div key={student.student_id} className="relative">
                <RankingCard
                  student={student}
                  type="xp"
                  isCurrentUser={student.student_id === currentUserId}
                  onClick={() => onStudentClick?.(student.student_id)}
                />
                
                {/* Badge de prêmio */}
                {index < 10 && (
                  <div className="absolute -right-1 -top-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                    +{PRIZES[index]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
