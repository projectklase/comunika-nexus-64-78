import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Filter, Eye, EyeOff, Clock, Archive, Sparkles } from 'lucide-react';
import { Post } from '@/types/post';
import { SmartPostFilters } from '@/utils/post-filters';

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
    <Card className={`glass-card border-border/50 overflow-hidden w-full max-w-full ${className}`}>
      <CardContent className="p-2.5 sm:p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary animate-pulse" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              Feed inteligente ativo
            </span>
            <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
              {hiddenCount} ocultos
            </Badge>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpired}
            className="h-9 min-h-[44px] text-xs hover:bg-muted/50 w-full sm:w-auto justify-center"
          >
            {hideExpired ? (
              <>
                <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5" />
                Mostrar todos
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5" />
                Ocultar passados
              </>
            )}
          </Button>
        </div>
        
        <div className="flex items-start gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0 mt-0.5" />
          <span className="leading-tight break-words">
            Posts expirados são ocultados automaticamente
          </span>
        </div>
      </CardContent>
    </Card>
  );
}