import { Holiday } from './br-holidays';

/**
 * Create a holiday event chip for calendar display
 */
export function createHolidayEventChip(holiday: Holiday, date: Date) {
  return {
    id: `holiday-${holiday.date}`,
    title: holiday.name,
    startDate: date,
    endDate: date,
    subtype: 'HOLIDAY' as const,
    classId: 'holiday',
    classIds: ['holiday'],
    meta: {
      title: holiday.name,
      author: 'Sistema',
      body: `Feriado ${holiday.type === 'national' ? 'Nacional' : holiday.type === 'civic' ? 'Cívico' : 'Religioso'}`,
      audience: 'GLOBAL',
      attachments: [],
      activityMeta: undefined,
      dueAt: undefined,
      // All-day: use local YMD instead of ISO to avoid timezone shifts
      eventStartAt: undefined,
      eventEndAt: undefined,
      eventLocation: undefined,
      holidayType: holiday.type,
      holidayName: holiday.name,
      holidayDateYmd: holiday.date,
      allDay: true,
    },
    postId: `holiday-${holiday.date}`,
    status: 'PUBLISHED' as const,
    category: 'holiday' as const
  };
}

/**
 * Format holiday display text for calendar
 */
export function formatHolidayDisplay(holiday: Holiday): string {
  const typeLabels = {
    national: '🇧🇷',
    civic: '🏛️', 
    religious: '⛪'
  };
  
  return `${typeLabels[holiday.type]} ${holiday.name}`;
}