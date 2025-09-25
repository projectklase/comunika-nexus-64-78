import { getBrHolidays, Holiday } from './br-holidays';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { parseYmdLocal, formatYmdToPtBrLong } from '@/lib/date-helpers';
import { ptBR } from 'date-fns/locale';

/**
 * Get Brazilian holidays that fall within the current week
 */
export function getCurrentWeekHolidays(referenceDate: Date = new Date()): Holiday[] {
  const year = referenceDate.getFullYear();
  const holidays = getBrHolidays(year);
  
  const weekStart = startOfWeek(referenceDate, { locale: ptBR, weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(referenceDate, { locale: ptBR, weekStartsOn: 1 }); // Sunday
  
  return holidays.filter(holiday => {
    const holidayDate = parseYmdLocal(holiday.date);
    return holidayDate ? isWithinInterval(holidayDate, { start: weekStart, end: weekEnd }) : false;
  });
}

/**
 * Get holidays for a specific date range (used for deduplication)
 */
export function getHolidaysInRange(startDate: Date, endDate: Date): Holiday[] {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  
  const holidays: Holiday[] = [];
  
  // Handle year transitions
  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getBrHolidays(year);
    holidays.push(...yearHolidays.filter(holiday => {
      const holidayDate = parseYmdLocal(holiday.date);
      return holidayDate ? isWithinInterval(holidayDate, { start: startDate, end: endDate }) : false;
    }));
  }
  
  return holidays;
}

/**
 * Generate unique key for holiday notifications to prevent duplicates
 */
export function generateHolidayNotificationKey(
  holiday: Holiday, 
  userId: string, 
  weekStartDate: string
): string {
  return `holiday:${holiday.date}:${userId}:week:${weekStartDate}`;
}

/**
 * Check if holiday notification already exists for user/week
 */
export function hasHolidayNotification(
  holiday: Holiday, 
  userId: string, 
  weekStartDate: string,
  existingKeys: Set<string>
): boolean {
  const key = generateHolidayNotificationKey(holiday, userId, weekStartDate);
  return existingKeys.has(key);
}

/**
 * Format holiday for notification  
 */
export function formatHolidayNotification(holiday: Holiday) {
  const typeLabels = {
    national: 'Feriado Nacional',
    civic: 'Feriado Cívico', 
    religious: 'Feriado Religioso'
  };
  
  return {
    title: `${typeLabels[holiday.type]}: ${holiday.name}`,
    message: `${holiday.name} - ${formatYmdToPtBrLong(holiday.date)}`,
    type: 'HOLIDAY' as const,
    subtype: holiday.type,
    // Use unified calendar link format - will be updated by NotificationPanel
    link: null, 
    meta: {
      holidayDate: holiday.date,
      holidayType: holiday.type,
      holidayName: holiday.name
    }
  };
}