import { useState, useCallback } from 'react';

/**
 * Default tokens to avoid empty string values in Select components
 */
export const DEFAULT_SELECT_TOKENS = {
  ALL_CLASSES: 'ALL_CLASSES',
  ALL_TYPES: 'ALL_TYPES', 
  ALL_STATUS: 'ALL_STATUS',
  ALL_PERIODS: 'ALL_PERIODS',
  ALL_LEVELS: 'ALL_LEVELS',
  ALL_MODALITIES: 'ALL_MODALITIES',
  ALL_SUBJECTS: 'ALL_SUBJECTS',
  ALL_TEACHERS: 'ALL_TEACHERS',
  ALL_STUDENTS: 'ALL_STUDENTS',
  ALL_YEARS: 'ALL_YEARS',
  ALL_GRADES: 'ALL_GRADES',
  ALL_DEADLINES: 'ALL_DEADLINES',
  ALL_ATTACHMENTS: 'ALL_ATTACHMENTS',
  DUE_DATE: 'dueAt',
  CREATED_DATE: 'createdAt',
  ALPHABETICAL: 'title',
  IGNORE: 'IGNORE'
} as const;

export type SelectToken = typeof DEFAULT_SELECT_TOKENS[keyof typeof DEFAULT_SELECT_TOKENS];

interface UseSelectStateOptions {
  defaultToken: SelectToken;
  onValueChange?: (value: string) => void;
}

/**
 * Hook for managing Select component state with proper token handling
 * Prevents empty string values that cause Select component errors
 */
export function useSelectState({ defaultToken, onValueChange }: UseSelectStateOptions) {
  const [value, setValue] = useState<string>(defaultToken);

  const handleValueChange = useCallback((newValue: string) => {
    // Ensure we never set an empty string
    const safeValue = newValue || defaultToken;
    setValue(safeValue);
    onValueChange?.(safeValue);
  }, [defaultToken, onValueChange]);

  const reset = useCallback(() => {
    setValue(defaultToken);
    onValueChange?.(defaultToken);
  }, [defaultToken, onValueChange]);

  const isDefault = useCallback((checkValue?: string) => {
    return (checkValue || value) === defaultToken;
  }, [value, defaultToken]);

  return {
    value,
    setValue: handleValueChange,
    reset,
    isDefault,
    defaultToken
  };
}

/**
 * Utility to restore preferences safely, replacing empty/null/undefined with default token
 */
export function safeRestoreSelectValue(
  storedValue: string | null | undefined, 
  defaultToken: SelectToken
): string {
  if (!storedValue || storedValue === '') {
    return defaultToken;
  }
  return storedValue;
}

/**
 * Utility to check if a filter is active (not the default token)
 */
export function isFilterActive(value: string, defaultToken: SelectToken): boolean {
  return value !== defaultToken;
}