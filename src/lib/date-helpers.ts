import { isValid, parse, format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Combine date string (dd/mm/yyyy) and time string (HH:mm) into a Date object
 */
export const combineDateTime = (
  dateStr: string, 
  timeStr: string, 
  timezone?: string
): Date | null => {
  if (!dateStr || !timeStr) return null;
  
  // Parse date
  const cleanDate = dateStr.replace(/\D/g, '');
  if (cleanDate.length !== 8) return null;
  
  const day = parseInt(cleanDate.substring(0, 2), 10);
  const month = parseInt(cleanDate.substring(2, 4), 10);
  const year = parseInt(cleanDate.substring(4, 8), 10);
  
  // Parse time
  const cleanTime = timeStr.replace(/\D/g, '');
  if (cleanTime.length !== 4) return null;
  
  const hours = parseInt(cleanTime.substring(0, 2), 10);
  const minutes = parseInt(cleanTime.substring(2, 4), 10);
  
  // Validate ranges
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  
  const date = new Date(year, month - 1, day, hours, minutes);
  
  return isValid(date) && 
         date.getDate() === day && 
         date.getMonth() === month - 1 && 
         date.getFullYear() === year ? date : null;
};

/**
 * Parse Brazilian date format (dd/mm/yyyy) to Date
 */
export const parseDateBR = (dateStr: string): Date | null => {
  if (!dateStr || dateStr.length < 10) return null;
  
  const cleanDate = dateStr.replace(/\D/g, '');
  if (cleanDate.length !== 8) return null;
  
  const day = parseInt(cleanDate.substring(0, 2), 10);
  const month = parseInt(cleanDate.substring(2, 4), 10);
  const year = parseInt(cleanDate.substring(4, 8), 10);
  
  const date = new Date(year, month - 1, day);
  return isValid(date) && 
         date.getDate() === day && 
         date.getMonth() === month - 1 && 
         date.getFullYear() === year ? date : null;
};

/**
 * Parse time format (HH:mm) and validate
 */
export const parseTime = (timeStr: string): { valid: boolean; hours?: number; minutes?: number } => {
  if (!timeStr || timeStr.length < 5) return { valid: false };
  
  const cleanTime = timeStr.replace(/\D/g, '');
  if (cleanTime.length !== 4) return { valid: false };
  
  const hours = parseInt(cleanTime.substring(0, 2), 10);
  const minutes = parseInt(cleanTime.substring(2, 4), 10);
  
  const valid = hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  return { valid, hours, minutes };
};

/**
 * Format Date to Brazilian date format (dd/MM/yyyy)
 */
export const formatDateBR = (date: Date): string => {
  if (!isValid(date)) return "";
  return format(date, "dd/MM/yyyy", { locale: ptBR });
};

/**
 * Format Date to Brazilian time format (HH:mm)
 */
export const formatTimeBR = (date: Date): string => {
  if (!isValid(date)) return "";
  return format(date, "HH:mm", { locale: ptBR });
};

/**
 * Split a Date into separate date and time strings
 */
export const splitDateTime = (date: Date): { dateStr: string; timeStr: string } => {
  if (!isValid(date)) return { dateStr: "", timeStr: "" };
  
  return {
    dateStr: formatDateBR(date),
    timeStr: formatTimeBR(date)
  };
};

/**
 * Check if a date/time combination is in the future by a given margin
 */
export const isFutureByMargin = (
  dateStr: string, 
  timeStr: string, 
  marginMinutes: number = 0
): boolean => {
  const dateTime = combineDateTime(dateStr, timeStr);
  if (!dateTime) return false;
  
  const now = new Date();
  const marginMs = marginMinutes * 60 * 1000;
  const minDateTime = new Date(now.getTime() + marginMs);
  
  return dateTime >= minDateTime;
};

/**
 * Check if date/time is in the past with tolerance
 */
export const isPastWithTolerance = (
  dateStr: string, 
  timeStr: string, 
  toleranceMinutes: number = 0
): boolean => {
  const dateTime = combineDateTime(dateStr, timeStr);
  if (!dateTime) return false;
  
  const now = new Date();
  const toleranceMs = toleranceMinutes * 60 * 1000;
  const minDateTime = new Date(now.getTime() - toleranceMs);
  
  return dateTime < minDateTime;
};

/**
 * Parse YYYY-MM-DD as a local date (00:00 local time)
 * Avoids UTC shifts that happen with new Date('YYYY-MM-DD') or toISOString
 */
export const parseYmdLocal = (ymd: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd));
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  const date = new Date(y, mo - 1, d);
  return isValid(date) &&
    date.getFullYear() === y &&
    date.getMonth() === mo - 1 &&
    date.getDate() === d
    ? date
    : null;
};

/**
 * Format Date to local YYYY-MM-DD string (using local getters)
 */
export const toYmdLocal = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Compare two dates by local day
 */
export const isSameLocalDay = (a: Date, b: Date): boolean => {
  return toYmdLocal(a) === toYmdLocal(b);
};

/**
 * Format a YYYY-MM-DD string to pt-BR long date (weekday, day de month) in local timezone
 */
export const formatYmdToPtBrLong = (ymd: string): string => {
  const d = parseYmdLocal(ymd);
  if (!d) return ymd;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: tz,
  }).format(d);
};