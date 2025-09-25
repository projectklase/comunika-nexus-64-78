import { isSameDay } from 'date-fns';
import { NormalizedCalendarEvent } from './calendar-events';
import { sortCalendarEvents } from './calendar-sorting';

export interface DayItemsConfig {
  activeFilters: {
    events: boolean;
    deadlines: boolean;
  };
  visibleLimit: number;
}

export interface ComputedDayItems {
  allItems: NormalizedCalendarEvent[];
  visibleItems: NormalizedCalendarEvent[];
  overflowItems: NormalizedCalendarEvent[];
  overflowCount: number;
  hasOverflow: boolean;
}

/**
 * Centralized computation of day items with filtering, sorting, and overflow logic
 */
export function computeDayItems(
  date: Date,
  allEvents: NormalizedCalendarEvent[],
  config: DayItemsConfig
): ComputedDayItems {
  // 1. Filter events for this specific day
  const dayEvents = allEvents.filter(event => 
    isSameDay(event.startDate, date) || 
    (event.type === 'event' && event.startDate <= date && event.endDate >= date)
  );

  // 2. Apply active filters
  const filteredEvents = dayEvents.filter(event => {
    if (event.type === 'event' && !config.activeFilters.events) return false;
    if (event.type === 'deadline' && !config.activeFilters.deadlines) return false;
    return true;
  });

  // 3. Sort events using established sorting logic
  const sortedEvents = sortCalendarEvents(filteredEvents);

  // 4. Split into visible and overflow items
  const visibleItems = sortedEvents.slice(0, config.visibleLimit);
  const overflowItems = sortedEvents.slice(config.visibleLimit);
  const overflowCount = overflowItems.length;
  const hasOverflow = overflowCount > 0;

  return {
    allItems: sortedEvents,
    visibleItems,
    overflowItems,
    overflowCount,
    hasOverflow
  };
}

/**
 * Get display text for overflow count
 */
export function getOverflowText(count: number): string {
  return count === 1 ? '+1 item' : `+${count} itens`;
}

/**
 * Get aria label for overflow button
 */
export function getOverflowAriaLabel(count: number, date: Date): string {
  const dayText = date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit' 
  });
  return `Ver mais ${count} ${count === 1 ? 'item' : 'itens'} do dia ${dayText}`;
}