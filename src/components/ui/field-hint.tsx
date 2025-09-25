import React from 'react';
import { cn } from '@/lib/utils';
import { Info, CheckCircle, AlertTriangle } from 'lucide-react';

interface FieldHintProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
  className?: string;
}

export function FieldHint({ type = 'info', children, className }: FieldHintProps) {
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertTriangle,
  };

  const Icon = icons[type];

  const variants = {
    info: 'text-muted-foreground border-border',
    success: 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30',
    warning: 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30',
    error: 'text-destructive border-destructive/20 bg-destructive/5',
  };

  return (
    <div className={cn(
      'flex items-start gap-2 text-sm p-2 border rounded-md',
      variants[type],
      className
    )}>
      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function AdjustmentHint({ field, reason, oldValue, newValue }: {
  field: string;
  reason: string;
  oldValue: any;
  newValue: any;
}) {
  return (
    <FieldHint type="success">
      <div className="space-y-1">
        <p className="font-medium">{reason}</p>
        {oldValue !== newValue && (
          <p className="text-xs opacity-75">
            De: "{String(oldValue)}" → Para: "{String(newValue)}"
          </p>
        )}
      </div>
    </FieldHint>
  );
}