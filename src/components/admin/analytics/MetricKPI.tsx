import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricKPIProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  colorScheme: 'green' | 'cyan' | 'amber' | 'red' | 'purple';
  trend?: React.ReactNode;
}

const colorClasses = {
  green: {
    text: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: 'text-green-400'
  },
  cyan: {
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    icon: 'text-cyan-400'
  },
  amber: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: 'text-amber-400'
  },
  red: {
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'text-red-400'
  },
  purple: {
    text: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: 'text-purple-400'
  }
};

export function MetricKPI({ title, value, icon: Icon, description, colorScheme, trend }: MetricKPIProps) {
  const colors = colorClasses[colorScheme];

  return (
    <Card className={cn(
      "backdrop-blur-sm bg-slate-950/50 border-2 transition-all duration-300 hover:scale-105",
      colors.border
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="font-mono uppercase tracking-wider text-xs text-slate-400 mb-1">
              {title}
            </p>
            <div className={cn("text-3xl font-bold font-mono", colors.text)}>
              {value}
            </div>
          </div>
          <div className={cn("p-2 rounded-lg", colors.bg)}>
            <Icon className={cn("h-5 w-5", colors.icon)} />
          </div>
        </div>
        {description && (
          <p className="text-xs text-slate-500 font-mono mt-2">
            {description}
          </p>
        )}
        {trend && (
          <div className="mt-2">
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
