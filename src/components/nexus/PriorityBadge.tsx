import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriorityBadgeProps {
  risk: 'low' | 'medium' | 'high';
  score: number;
  className?: string;
  showIcon?: boolean;
}

export function PriorityBadge({ risk, score, className, showIcon = true }: PriorityBadgeProps) {
  const getRiskConfig = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'high':
        return {
          label: 'Alto Risco',
          className: 'bg-red-500/20 text-red-400 border-red-500/30',
          icon: AlertTriangle
        };
      case 'medium':
        return {
          label: 'Risco Médio',
          className: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
          icon: Clock
        };
      case 'low':
        return {
          label: 'Baixo Risco',
          className: 'bg-green-500/20 text-green-400 border-green-500/30',
          icon: CheckCircle
        };
    }
  };

  const config = getRiskConfig(risk);
  const Icon = config.icon;

  return (
    <Badge className={cn('text-xs flex items-center gap-1', config.className, className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
      <span className="opacity-70">({Math.round(score * 100)}%)</span>
    </Badge>
  );
}