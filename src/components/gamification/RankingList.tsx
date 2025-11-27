import { ScrollArea } from '@/components/ui/scroll-area';
import { RankingCard } from './RankingCard';
import { Loader2 } from 'lucide-react';

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

interface RankingListProps {
  students: RankedStudent[];
  type: 'xp' | 'koins' | 'streak';
  currentUserId?: string;
  isLoading?: boolean;
  onStudentClick?: (studentId: string) => void;
}

const getTitleByType = (type: string) => {
  if (type === 'xp') return 'Top XP';
  if (type === 'koins') return 'Top Koins';
  if (type === 'streak') return 'Top Streakers';
  return '';
};

const getIconByType = (type: string) => {
  if (type === 'xp') return '⭐';
  if (type === 'koins') return '💰';
  if (type === 'streak') return '🔥';
  return '';
};

export function RankingList({ students, type, currentUserId, isLoading, onStudentClick }: RankingListProps) {
  return (
    <div className="bg-background/60 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{getIconByType(type)}</span>
        <h3 className="text-lg font-bold">{getTitleByType(type)}</h3>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum aluno encontrado
        </div>
      ) : (
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {students.map((student) => (
              <RankingCard
                key={student.student_id}
                student={student}
                type={type}
                isCurrentUser={student.student_id === currentUserId}
                onClick={() => onStudentClick?.(student.student_id)}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
