import { useCallback, useMemo } from 'react';

interface FormField {
  hasError: boolean;
  validate: () => string | null;
}

export function useFormGuard(fields: Record<string, FormField>) {
  const hasErrors = useMemo(() => {
    return Object.values(fields).some(field => field.hasError);
  }, [fields]);

  const validateAll = useCallback(() => {
    const errors: Record<string, string | null> = {};
    let hasAnyError = false;

    Object.entries(fields).forEach(([key, field]) => {
      const error = field.validate();
      errors[key] = error;
      if (error) hasAnyError = true;
    });

    return { errors, hasErrors: hasAnyError };
  }, [fields]);

  const canSubmit = useCallback(() => {
    const { hasErrors: validationErrors } = validateAll();
    return !hasErrors && !validationErrors;
  }, [hasErrors, validateAll]);

  const handleSubmit = useCallback((onSubmit: () => void) => {
    const { hasErrors: validationErrors } = validateAll();
    
    if (!hasErrors && !validationErrors) {
      onSubmit();
      return true;
    }
    
    return false;
  }, [hasErrors, validateAll]);

  return {
    hasErrors,
    canSubmit,
    validateAll,
    handleSubmit
  };
}