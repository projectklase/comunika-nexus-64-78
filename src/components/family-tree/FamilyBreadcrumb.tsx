import { ChevronRight, Home, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FamilyBreadcrumbProps {
  guardianName?: string;
  studentCount?: number;
  onReset: () => void;
}

export function FamilyBreadcrumb({ guardianName, studentCount, onReset }: FamilyBreadcrumbProps) {
  if (!guardianName) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="h-8 gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="text-xs">Todas as Famílias</span>
      </Button>
      
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
      
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pink-500/20 border border-pink-500/30">
        <Users className="h-3.5 w-3.5 text-pink-400" />
        <span className="text-sm font-semibold text-foreground">
          {guardianName}
        </span>
        {studentCount && (
          <span className="text-xs text-muted-foreground">
            ({studentCount} {studentCount === 1 ? 'aluno' : 'alunos'})
          </span>
        )}
      </div>
    </div>
  );
}
