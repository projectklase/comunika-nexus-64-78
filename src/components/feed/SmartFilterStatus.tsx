import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Clock, Sparkles } from 'lucide-react';

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
    <div className={`w-full p-3 rounded-lg bg-muted/30 border border-border/50 ${className || ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        
        {/* Info */}
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse" />
          <span className="text-xs sm:text-sm text-muted-foreground">
            Feed inteligente ativo
          </span>
          <Badge variant="secondary" className="text-xs shrink-0 bg-primary/20 text-primary">
            {hiddenCount} ocultos
          </Badge>
        </div>

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpired}
          className="h-9 text-xs shrink-0 w-full sm:w-auto justify-center hover:bg-muted/50"
        >
          {hideExpired ? (
            <>
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Mostrar todos
            </>
          ) : (
            <>
              <EyeOff className="h-3.5 w-3.5 mr-1.5" />
              Ocultar passados
            </>
          )}
        </Button>
      </div>
      
      <div className="flex items-start gap-1.5 mt-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3 shrink-0 mt-0.5" />
        <span className="leading-tight">
          Posts expirados são ocultados automaticamente
        </span>
      </div>
    </div>
  );
}