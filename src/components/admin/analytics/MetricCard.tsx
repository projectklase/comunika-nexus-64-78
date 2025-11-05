import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  tooltip: string;
  status?: 'success' | 'warning' | 'critical' | 'neutral';
  description?: string;
  trend?: number;
}

export function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  tooltip, 
  status = 'neutral',
  description,
  trend 
}: MetricCardProps) {
  const statusColors = {
    success: 'border-green-500/30 bg-green-500/5',
    warning: 'border-orange-500/30 bg-orange-500/5',
    critical: 'border-red-500/30 bg-red-500/5',
    neutral: 'border-border bg-card/50'
  };
  
  const valueColors = {
    success: 'text-green-500',
    warning: 'text-orange-500',
    critical: 'text-red-500',
    neutral: 'text-foreground'
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className={cn(
            "glassmorphism transition-all duration-300 cursor-help",
            "hover:scale-105 hover:shadow-lg",
            statusColors[status]
          )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                {title}
              </CardTitle>
              <Icon className={cn("h-4 w-4", valueColors[status])} />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-4xl font-bold font-mono",
                valueColors[status]
              )}>
                {value}
              </div>
              
              {description && (
                <p className="text-xs text-muted-foreground font-mono mt-2">
                  {description}
                </p>
              )}
              
              {trend !== undefined && (
                <div className={cn(
                  "flex items-center gap-1 mt-2 text-xs font-mono",
                  trend > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(trend)}% vs período anterior
                </div>
              )}
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs bg-popover border-border">
          <p className="text-xs font-mono">
            {tooltip}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
