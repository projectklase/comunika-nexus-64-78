import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ProgressBarWithTooltipProps {
  value: number;
  maxValue: number;
  tooltipContent: string;
  colorScheme?: 'green' | 'cyan' | 'amber' | 'red';
  showPercentage?: boolean;
  className?: string;
}

export function ProgressBarWithTooltip({
  value,
  maxValue,
  tooltipContent,
  colorScheme,
  showPercentage = true,
  className
}: ProgressBarWithTooltipProps) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  
  // Auto color scheme based on percentage if not provided
  const autoColorScheme = colorScheme || (
    percentage > 80 ? 'green' :
    percentage > 60 ? 'cyan' :
    percentage > 40 ? 'amber' : 'red'
  );

  const gradients = {
    green: 'from-green-500 via-green-400 to-green-300',
    cyan: 'from-cyan-500 via-cyan-400 to-cyan-300',
    amber: 'from-amber-500 to-amber-400',
    red: 'from-red-500 to-red-400'
  };

  const textColors = {
    green: 'text-green-400',
    cyan: 'text-cyan-400',
    amber: 'text-amber-400',
    red: 'text-red-400'
  };

  return (
    <div className={cn("w-full", className)}>
      {showPercentage && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-mono text-slate-400 uppercase">Taxa de Conclusão</span>
          <span className={cn("text-sm font-mono font-bold", textColors[autoColorScheme])}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      )}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-2 bg-slate-900 rounded-full overflow-hidden cursor-help">
              <div
                className={cn(
                  "h-full bg-gradient-to-r transition-all duration-700 ease-out",
                  gradients[autoColorScheme]
                )}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-slate-900 border border-slate-700">
            <p className="text-xs font-mono text-slate-200">{tooltipContent}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
