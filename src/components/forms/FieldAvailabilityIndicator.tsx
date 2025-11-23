import React from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldAvailabilityIndicatorProps {
  isChecking: boolean;
  isAvailable: boolean | null;
  fieldLabel: string;
  className?: string;
}

export function FieldAvailabilityIndicator({ 
  isChecking, 
  isAvailable, 
  fieldLabel,
  className 
}: FieldAvailabilityIndicatorProps) {
  if (isChecking) {
    return (
      <div className={cn('flex items-center gap-1.5 text-sm text-muted-foreground', className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Verificando...</span>
      </div>
    );
  }

  if (isAvailable === true) {
    return (
      <div className={cn('flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400', className)}>
        <Check className="h-3.5 w-3.5" />
        <span>{fieldLabel} disponível</span>
      </div>
    );
  }

  if (isAvailable === false) {
    return (
      <div className={cn('flex items-center gap-1.5 text-sm text-destructive', className)}>
        <X className="h-3.5 w-3.5" />
        <span>{fieldLabel} já cadastrado</span>
      </div>
    );
  }

  return null;
}
