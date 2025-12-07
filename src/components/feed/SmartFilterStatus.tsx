import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Sparkles } from 'lucide-react';

interface SmartFilterStatusProps {
  totalPosts: number;
  filteredPosts: number;
  hideExpired: boolean;
  onToggleExpired: () => void;
  className?: string;
}

export function SmartFilterStatus({ 
  totalPosts, 
  filteredPosts, 
  hideExpired,
  onToggleExpired,
  className 
}: SmartFilterStatusProps) {
  const hiddenCount = totalPosts - filteredPosts;

  if (hiddenCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-lg bg-muted/30 border border-border/50 w-full">
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
        <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">
          {filteredPosts}/{totalPosts}
        </Badge>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleExpired}
        className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3 shrink-0"
      >
        {hideExpired ? (
          <>
            <Eye className="h-3 w-3 sm:mr-1" />
            <span className="hidden sm:inline">Mostrar todos</span>
          </>
        ) : (
          <>
            <EyeOff className="h-3 w-3 sm:mr-1" />
            <span className="hidden sm:inline">Ocultar expirados</span>
          </>
        )}
      </Button>
    </div>
  );
}