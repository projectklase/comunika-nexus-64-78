import { useState, useCallback } from 'react';
import { ValidationResult, ValidationError } from '@/lib/data-hygiene';

export function useFormValidation<T>() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [adjustments, setAdjustments] = useState<{ field: string; reason: string; old: any; new: any }[]>([]);

  const handleValidationResult = useCallback((result: ValidationResult<T>) => {
    // Set field errors
    const errorMap: Record<string, string> = {};
    result.errors.forEach(error => {
      errorMap[error.field] = error.message;
    });
    setErrors(errorMap);

    // Set adjustments for UI feedback
    setAdjustments(result.adjustments);

    return result;
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setAdjustments([]);
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const scrollToFirstError = useCallback(() => {
    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) {
      const element = document.querySelector(`[name="${firstErrorField}"], [data-field="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Focus if it's an input
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          element.focus();
        }
      }
    }
  }, [errors]);

  const hasErrors = Object.keys(errors).length > 0;
  const hasAdjustments = adjustments.length > 0;

  const getFieldError = useCallback((field: string) => errors[field], [errors]);
  const getFieldAdjustment = useCallback((field: string) => 
    adjustments.find(adj => adj.field === field), [adjustments]);

  return {
    errors,
    adjustments,
    hasErrors,
    hasAdjustments,
    handleValidationResult,
    clearErrors,
    clearFieldError,
    scrollToFirstError,
    getFieldError,
    getFieldAdjustment,
  };
}