import { useMemo } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityCountdownProps {
  dueDate: string | Date;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

interface CountdownResult {
  text: string;
  colorClass: string;
  pulse: boolean;
}

function getCountdownDisplay(dueDate: Date): CountdownResult {
  const now = new Date();
  const diff = dueDate.getTime() - now.getTime();
  
  // If overdue
  if (diff <= 0) {
    return { 
      text: 'Atrasado', 
      colorClass: 'text-destructive', 
      pulse: false 
    };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  // More than 24h - green
  if (days > 0) {
    return { 
      text: `${days}d ${hours}h`, 
      colorClass: 'text-emerald-500', 
      pulse: false 
    };
  }
  
  // 6-24h - yellow
  if (hours >= 6) {
    return { 
      text: `${hours}h ${minutes}min`, 
      colorClass: 'text-yellow-500', 
      pulse: false 
    };
  }
  
  // 1-6h - orange
  if (hours >= 1) {
    return { 
      text: `${hours}h ${minutes}min`, 
      colorClass: 'text-orange-500', 
      pulse: true 
    };
  }
  
  // Less than 1h - red with pulse
  return { 
    text: `${minutes}min`, 
    colorClass: 'text-destructive', 
    pulse: true 
  };
}

export function ActivityCountdown({ 
  dueDate, 
  size = 'sm', 
  showIcon = true,
  className 
}: ActivityCountdownProps) {
  const countdown = useMemo(() => {
    const date = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    return getCountdownDisplay(date);
  }, [dueDate]);

  const sizeClasses = {
    sm: 'text-[10px] gap-1',
    md: 'text-xs gap-1.5'
  };

  const iconSizes = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3'
  };

  return (
    <div 
      className={cn(
        "flex items-center font-medium",
        sizeClasses[size],
        countdown.colorClass,
        countdown.pulse && "animate-pulse",
        className
      )}
    >
      {showIcon && <Timer className={iconSizes[size]} />}
      <span>{countdown.text}</span>
    </div>
  );
}
