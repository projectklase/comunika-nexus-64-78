import { Post } from '@/types/post';
import { NormalizedCalendarEvent, normalizeCalendarEvents } from './calendar-events';
import { isSameDay } from 'date-fns';

export type DayItemFilter = 'all' | 'events' | 'activities' | 'trabalhos' | 'provas';

export interface DayFocusFilters {
  activeFilter: DayItemFilter;
  events: boolean;
  deadlines: boolean;
}

export interface DayFocusData {
  allItems: NormalizedCalendarEvent[];
  filteredItems: NormalizedCalendarEvent[];
  counts: {
    events: number;
    activities: number;
    trabalhos: number;
    provas: number;
    total: number;
  };
}

export function computeDayFocusData(
  date: Date,
  posts: Post[],
  userRole: string | undefined,
  filters: DayFocusFilters
): DayFocusData {
  // Get all normalized events
  const allEvents = normalizeCalendarEvents(posts, userRole);
  
  // Filter for this specific day
  const dayItems = allEvents.filter(event => 
    isSameDay(event.startDate, date)
  );

  // Sort by priority: all-day first, then by time, then by type, then by title
  const sortedItems = [...dayItems].sort((a, b) => {
    // All-day events first (events at 00:00)
    const aIsAllDay = a.subtype === 'EVENTO' && a.startDate.getHours() === 0 && a.startDate.getMinutes() === 0;
    const bIsAllDay = b.subtype === 'EVENTO' && b.startDate.getHours() === 0 && b.startDate.getMinutes() === 0;
    
    if (aIsAllDay && !bIsAllDay) return -1;
    if (!aIsAllDay && bIsAllDay) return 1;
    
    // Sort by time
    const timeComparison = a.startDate.getTime() - b.startDate.getTime();
    if (timeComparison !== 0) return timeComparison;
    
    // Sort by type priority: EVENTO → ATIVIDADE → TRABALHO → PROVA
    const typePriority = { 'EVENTO': 1, 'ATIVIDADE': 2, 'TRABALHO': 3, 'PROVA': 4 };
    const aPriority = typePriority[a.subtype as keyof typeof typePriority] || 999;
    const bPriority = typePriority[b.subtype as keyof typeof typePriority] || 999;
    
    if (aPriority !== bPriority) return aPriority - bPriority;
    
    // Sort by title
    return a.title.localeCompare(b.title, 'pt-BR');
  });

  // Calculate counts
  const counts = {
    events: sortedItems.filter(item => item.type === 'event').length,
    activities: sortedItems.filter(item => item.subtype === 'ATIVIDADE').length,
    trabalhos: sortedItems.filter(item => item.subtype === 'TRABALHO').length,
    provas: sortedItems.filter(item => item.subtype === 'PROVA').length,
    total: sortedItems.length,
  };

  // Apply filters
  let filteredItems = sortedItems;

  // First apply type filters (events/deadlines)
  if (!filters.events) {
    filteredItems = filteredItems.filter(item => item.type !== 'event');
  }
  if (!filters.deadlines) {
    filteredItems = filteredItems.filter(item => item.type !== 'deadline');
  }

  // Then apply specific subtype filter
  if (filters.activeFilter !== 'all') {
    switch (filters.activeFilter) {
      case 'events':
        filteredItems = filteredItems.filter(item => item.type === 'event');
        break;
      case 'activities':
        filteredItems = filteredItems.filter(item => item.subtype === 'ATIVIDADE');
        break;
      case 'trabalhos':
        filteredItems = filteredItems.filter(item => item.subtype === 'TRABALHO');
        break;
      case 'provas':
        filteredItems = filteredItems.filter(item => item.subtype === 'PROVA');
        break;
    }
  }

  return {
    allItems: sortedItems,
    filteredItems,
    counts,
  };
}

export function getDayItemDisplayType(event: NormalizedCalendarEvent): string {
  if (event.type === 'event') return 'Evento';
  return event.subtype === 'ATIVIDADE' ? 'Atividade' : 
         event.subtype === 'TRABALHO' ? 'Trabalho' : 'Prova';
}

export function getDayItemColor(event: NormalizedCalendarEvent): string {
  if (event.type === 'event') return 'amber';
  
  switch (event.subtype) {
    case 'ATIVIDADE': return 'blue';
    case 'TRABALHO': return 'orange';
    case 'PROVA': return 'red';
    default: return 'blue';
  }
}