import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Settings2, Clock, Building2, Star } from 'lucide-react';
import { PostType } from '@/types/post';
import { cn } from '@/lib/utils';

interface PreferencesIndicatorProps {
  appliedPrefs: {
    lastPostType: PostType;
    lastClassId: string;
    defaultEventDuration: number;
    source: 'dayFocus' | 'preferences' | 'manual';
  };
  onOpenPreferences?: () => void;
  className?: string;
}

export function PreferencesIndicator({ 
  appliedPrefs, 
  onOpenPreferences,
  className 
}: PreferencesIndicatorProps) {
  const getPostTypeIcon = (type: PostType) => {
    const icons = {
      'AVISO': '📢',
      'COMUNICADO': '📋', 
      'EVENTO': '📅',
      'ATIVIDADE': '📝',
      'TRABALHO': '📄',
      'PROVA': '📊'
    };
    return icons[type];
  };

  const getSourceLabel = (source: string) => {
    const labels = {
      'dayFocus': 'Do Dia em Foco',
      'preferences': 'Preferências',
      'manual': 'Manual'
    };
    return labels[source as keyof typeof labels] || source;
  };

  const getSourceIcon = (source: string) => {
    const icons = {
      'dayFocus': <Clock className="h-3 w-3" />,
      'preferences': <Settings2 className="h-3 w-3" />,
      'manual': <Star className="h-3 w-3" />
    };
    return icons[source as keyof typeof icons] || <Settings2 className="h-3 w-3" />;
  };

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {/* Applied preferences indicator */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className="h-6 text-xs bg-muted/50 border-muted-foreground/30"
            >
              {getSourceIcon(appliedPrefs.source)}
              <span className="ml-1">{getSourceLabel(appliedPrefs.source)}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">Configurações Aplicadas:</p>
              <p>• Tipo: {getPostTypeIcon(appliedPrefs.lastPostType)} {appliedPrefs.lastPostType}</p>
              {appliedPrefs.lastClassId !== 'ALL_CLASSES' && (
                <p>• Turma: {appliedPrefs.lastClassId}</p>
              )}
              {appliedPrefs.lastPostType === 'EVENTO' && (
                <p>• Duração: {appliedPrefs.defaultEventDuration}min</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Fonte: {getSourceLabel(appliedPrefs.source)}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Individual preference badges */}
      <Badge variant="outline" className="h-6 text-xs">
        {getPostTypeIcon(appliedPrefs.lastPostType)}
        <span className="ml-1">{appliedPrefs.lastPostType}</span>
      </Badge>

      {appliedPrefs.lastClassId !== 'ALL_CLASSES' && (
        <Badge variant="outline" className="h-6 text-xs">
          <Building2 className="h-3 w-3 mr-1" />
          Turma
        </Badge>
      )}

      {appliedPrefs.lastPostType === 'EVENTO' && (
        <Badge variant="outline" className="h-6 text-xs">
          <Clock className="h-3 w-3 mr-1" />
          {appliedPrefs.defaultEventDuration}min
        </Badge>
      )}

      {/* Preferences button */}
      {onOpenPreferences && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenPreferences}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Settings2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Abrir Preferências
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}