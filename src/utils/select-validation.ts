/**
 * Select component validation and standardization utilities
 */

import { DEFAULT_SELECT_TOKENS } from '@/hooks/useSelectState';

/**
 * Validate that SelectItem has proper value prop
 */
export function validateSelectItemValue(value: string | undefined, itemText: string): string {
  if (!value || value === '') {
    console.warn(`SelectItem "${itemText}" has empty value. Using fallback.`);
    return DEFAULT_SELECT_TOKENS.IGNORE;
  }
  return value;
}

/**
 * Standardize "all" values to use proper tokens
 */
export function standardizeSelectValue(value: string | undefined, context: string): string {
  if (!value || value === '' || value === 'all') {
    switch (context) {
      case 'classes':
        return DEFAULT_SELECT_TOKENS.ALL_CLASSES;
      case 'status':
        return DEFAULT_SELECT_TOKENS.ALL_STATUS;
      case 'types':
        return DEFAULT_SELECT_TOKENS.ALL_TYPES;
      case 'periods':
        return DEFAULT_SELECT_TOKENS.ALL_PERIODS;
      case 'levels':
        return DEFAULT_SELECT_TOKENS.ALL_LEVELS;
      case 'modalities':
        return DEFAULT_SELECT_TOKENS.ALL_MODALITIES;
      case 'subjects':
        return DEFAULT_SELECT_TOKENS.ALL_SUBJECTS;
      case 'teachers':
        return DEFAULT_SELECT_TOKENS.ALL_TEACHERS;
      case 'students':
        return DEFAULT_SELECT_TOKENS.ALL_STUDENTS;
      case 'years':
        return DEFAULT_SELECT_TOKENS.ALL_YEARS;
      case 'grades':
        return DEFAULT_SELECT_TOKENS.ALL_GRADES;
      case 'deadlines':
        return DEFAULT_SELECT_TOKENS.ALL_DEADLINES;
      case 'attachments':
        return DEFAULT_SELECT_TOKENS.ALL_ATTACHMENTS;
      default:
        return DEFAULT_SELECT_TOKENS.ALL_STATUS;
    }
  }
  return value;
}

/**
 * Check if value represents "all/none" selection
 */
export function isAllOption(value: string, context: string): boolean {
  const standardized = standardizeSelectValue('all', context);
  return value === standardized;
}