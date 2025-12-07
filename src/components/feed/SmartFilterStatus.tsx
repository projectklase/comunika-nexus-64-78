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
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 w-full">
      
      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs sm:text-sm">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-muted-foreground">Feed inteligente ativo</span>
        </div>
        
        <Badge variant="secondary" className="text-xs shrink-0">
          {filteredPosts} de {totalPosts}
        </Badge>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleExpired}
        className="h-8 text-xs sm:text-sm shrink-0 w-full sm:w-auto justify-center"
      >
        {hideExpired ? (
          <>
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Mostrar todos
          </>
        ) : (
          <>
            <EyeOff className="h-3.5 w-3.5 mr-1.5" />
            Ocultar expirados
          </>
        )}
      </Button>
    </div>
  );
}