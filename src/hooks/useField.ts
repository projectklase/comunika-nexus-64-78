import { useState, useCallback } from 'react';

export interface UseFieldOptions<T = string> {
  initialValue?: T;
  validator?: (value: T) => string | null;
  formatter?: (value: string) => T;
}

export function useField<T = string>({
  initialValue,
  validator,
  formatter
}: UseFieldOptions<T> = {}) {
  const [value, setValue] = useState<T>(initialValue || ('' as T));
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const validate = useCallback((val: T) => {
    if (!validator) return null;
    const errorMsg = validator(val);
    setError(errorMsg);
    return errorMsg;
  }, [validator]);

  const handleChange = useCallback((newValue: string | T) => {
    const processedValue = formatter && typeof newValue === 'string' 
      ? formatter(newValue) 
      : newValue as T;
    
    setValue(processedValue);
    
    // Clear error on change if field was touched
    if (touched && error) {
      const newError = validate(processedValue);
      if (!newError) setError(null);
    }
  }, [formatter, touched, error, validate]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    validate(value);
  }, [value, validate]);

  const reset = useCallback(() => {
    setValue(initialValue || ('' as T));
    setError(null);
    setTouched(false);
  }, [initialValue]);

  return {
    value,
    setValue,
    error,
    setError,
    touched,
    onChange: handleChange,
    onBlur: handleBlur,
    validate: () => validate(value),
    reset,
    hasError: !!error && touched
  };
}