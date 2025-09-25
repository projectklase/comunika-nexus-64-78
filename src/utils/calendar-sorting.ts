import { NormalizedCalendarEvent } from './calendar-events';
import { format, parseISO } from 'date-fns';

// Define priority order for event types
const TYPE_PRIORITY = {
  'EVENTO': 1,
  'ATIVIDADE': 2,
  'TRABALHO': 3,
  'PROVA': 4
} as const;

export function sortCalendarEvents(events: NormalizedCalendarEvent[]): NormalizedCalendarEvent[] {
  return [...events].sort((a, b) => {
    // 1. All-day events first (events without specific time or spanning multiple days)
    const aIsAllDay = isAllDayEvent(a);
    const bIsAllDay = isAllDayEvent(b);
    
    if (aIsAllDay && !bIsAllDay) return -1;
    if (!aIsAllDay && bIsAllDay) return 1;
    
    // 2. Sort by start time (earliest first)
    const timeComparison = a.startDate.getTime() - b.startDate.getTime();
    if (timeComparison !== 0) return timeComparison;
    
    // 3. Sort by type priority (EVENTO → ATIVIDADE → TRABALHO → PROVA)
    const aPriority = TYPE_PRIORITY[a.subtype as keyof typeof TYPE_PRIORITY] || 999;
    const bPriority = TYPE_PRIORITY[b.subtype as keyof typeof TYPE_PRIORITY] || 999;
    
    if (aPriority !== bPriority) return aPriority - bPriority;
    
    // 4. Sort by title alphabetically
    return a.title.localeCompare(b.title, 'pt-BR');
  });
}

function isAllDayEvent(event: NormalizedCalendarEvent): boolean {
  // Consider all-day if:
  // 1. Event type and no specific time set (default to 00:00)
  // 2. Event spans multiple days
  // 3. Event has duration of 24 hours or more
  
  const duration = event.endDate.getTime() - event.startDate.getTime();
  const dayInMs = 24 * 60 * 60 * 1000;
  
  // If duration is 24h+ or event spans midnight
  if (duration >= dayInMs) return true;
  
  // If start time is 00:00 and it's an EVENTO (likely all-day)
  if (event.subtype === 'EVENTO') {
    const startHour = event.startDate.getHours();
    const startMinute = event.startDate.getMinutes();
    return startHour === 0 && startMinute === 0;
  }
  
  return false;
}

export function getEventTimeDisplay(event: NormalizedCalendarEvent): string {
  const isAllDay = isAllDayEvent(event);
  
  if (isAllDay) {
    return 'Todo dia';
  }
  
  return format(event.startDate, 'HH:mm');
}