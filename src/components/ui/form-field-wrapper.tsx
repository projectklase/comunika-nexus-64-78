import React from 'react';
import { FieldHint, AdjustmentHint } from './field-hint';
import { cn } from '@/lib/utils';

interface FormFieldWrapperProps {
  children: React.ReactNode;
  error?: string;
  adjustment?: { field: string; reason: string; old: any; new: any };
  className?: string;
}

export function FormFieldWrapper({ children, error, adjustment, className }: FormFieldWrapperProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {children}
      
      {adjustment && (
        <AdjustmentHint 
          field={adjustment.field}
          reason={adjustment.reason}
          oldValue={adjustment.old}
          newValue={adjustment.new}
        />
      )}
      
      {error && (
        <FieldHint type="error">
          {error}
        </FieldHint>
      )}
    </div>
  );
}