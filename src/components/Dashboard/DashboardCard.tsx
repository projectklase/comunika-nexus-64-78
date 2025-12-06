import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  description?: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'primary' | 'secondary' | 'success';
}

export function DashboardCard({
  title,
  description,
  value,
  icon: Icon,
  trend,
  variant = 'default'
}: DashboardCardProps) {
  const variantClasses = {
    default: 'glass-card border border-white/10 hover:border-white/20',
    primary: 'glass-card border-primary/30 neon-glow',
    secondary: 'glass-card border-secondary/30 shadow-[0_0_20px_hsl(var(--secondary)/0.3)]',
    success: 'glass-card border-success/30 shadow-[0_0_20px_hsl(var(--success)/0.3)]'
  };

  const iconClasses = {
    default: 'text-muted-foreground',
    primary: 'text-primary animate-glow-pulse',
    secondary: 'text-secondary',
    success: 'text-success'
  };

  return (
    <Card className={`${variantClasses[variant]} hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/5 transition-all duration-300`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${iconClasses[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mb-2">{description}</p>
        )}
        {trend && (
          <div className="flex items-center space-x-1">
            <span className={`text-xs ${trend.value > 0 ? 'text-success' : 'text-destructive'}`}>
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}