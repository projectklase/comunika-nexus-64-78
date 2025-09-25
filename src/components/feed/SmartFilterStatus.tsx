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
    <Card className={`glass-card border-border/50 ${className}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm text-muted-foreground">
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
            className="h-8 text-xs hover:bg-muted/50"
          >
            {hideExpired ? (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Mostrar todos
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                Ocultar passados
              </>
            )}
          </Button>
        </div>
        
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            Posts expirados e avisos antigos são automaticamente ocultados
          </span>
        </div>
      </CardContent>
    </Card>
  );
}