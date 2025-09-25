import { useState } from 'react';
import { AlertCircle, Move, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useConflictDetector } from '@/hooks/useConflictDetector';
import { cn } from '@/lib/utils';

interface ConflictIndicatorProps {
  blockId: string;
  date: string;
  startTime: string;
  endTime: string;
  className?: string;
  onResolved?: () => void;
}

export function ConflictIndicator({ 
  blockId, 
  date, 
  startTime, 
  endTime, 
  className,
  onResolved 
}: ConflictIndicatorProps) {
  const { checkBlockConflict, moveBlockToNextSlot } = useConflictDetector();
  const [isResolving, setIsResolving] = useState(false);

  const conflict = checkBlockConflict(date, startTime, endTime, blockId);

  if (!conflict.hasConflict) return null;

  const handleMoveToNextSlot = async () => {
    setIsResolving(true);
    try {
      const success = moveBlockToNextSlot(blockId);
      if (success && onResolved) {
        onResolved();
      }
    } finally {
      setIsResolving(false);
    }
  };

  const conflictMessage = [
    conflict.conflictingBlocks.length > 0 && `${conflict.conflictingBlocks.length} bloco(s)`,
    conflict.conflictingEvents.length > 0 && `${conflict.conflictingEvents.length} aula(s)`
  ].filter(Boolean).join(' e ');

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="destructive" 
            className="text-xs animate-pulse cursor-help"
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            Conflito
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">Conflito detectado!</p>
            <p className="text-muted-foreground">
              Sobreposição com {conflictMessage}
            </p>
            {conflict.nextAvailableSlot && (
              <p className="text-xs mt-1 text-green-400">
                Próximo slot: {conflict.nextAvailableSlot.startTime}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      {conflict.nextAvailableSlot && (
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs"
          onClick={handleMoveToNextSlot}
          disabled={isResolving}
        >
          {isResolving ? (
            <Clock className="h-3 w-3 animate-spin" />
          ) : (
            <Move className="h-3 w-3" />
          )}
          Mover
        </Button>
      )}
    </div>
  );
}