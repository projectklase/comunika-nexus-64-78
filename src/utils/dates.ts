import { isToday as dateFnsIsToday, isAfter, isBefore, addHours, format, differenceInDays } from 'date-fns';

/**
 * Check if a date is today
 */
export const isToday = (date: Date): boolean => {
  return dateFnsIsToday(date);
};

/**
 * Check if a date is within the next 48 hours
 */
export const withinNext48h = (date: Date): boolean => {
  const now = new Date();
  const next48h = addHours(now, 48);
  return isAfter(date, now) && isBefore(date, next48h);
};

/**
 * Format time in short format (HH:mm)
 */
export const formatTimeShort = (date: Date): string => {
  return format(date, 'HH:mm');
};

/**
 * Get a date key for localStorage (YYYY-MM-DD)
 */
export const getDateKey = (date: Date = new Date()): string => {
  return format(date, 'yyyy-MM-dd');
};

/**
 * Convert date to YYYY-MM-DD format
 */
export const toYMD = (date: Date | string): string => {
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  return format(date, 'yyyy-MM-dd');
};

/**
 * Calculate difference in days between two dates
 */
export const diffDays = (date1: Date | string, date2: Date | string): number => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  return differenceInDays(d1, d2);
};

/**
 * Get week range (Monday to Sunday) containing the given date
 */
export const getWeekRange = (date: Date = new Date()): { start: Date; end: Date } => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

/**
 * Check if given date is a Monday
 */
export const isMonday = (date: Date = new Date()): boolean => {
  return date.getDay() === 1;
};