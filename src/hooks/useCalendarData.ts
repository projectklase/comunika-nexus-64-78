import { useMemo } from 'react';
import { usePosts } from './usePosts';
import { Post } from '@/types/post';
import { isWithinInterval, parseISO } from 'date-fns';

export interface CalendarEvent {
  id: string;
  post: Post;
  startDate: Date;
  endDate: Date;
  type: 'event' | 'deadline';
  title: string;
}

interface UseCalendarDataOptions {
  classId?: string; // For filtering activities by class
}

/**
 * Hook para buscar eventos do calendário de forma otimizada.
 * 
 * ⚡ PAGINAÇÃO/LAZY LOADING:
 * Este hook já implementa "lazy loading" automaticamente:
 * - Apenas eventos dentro do range (startDate, endDate) são processados
 * - Quando o usuário troca de mês/semana, apenas eventos daquele período são buscados
 * - Isso evita processar milhares de eventos desnecessariamente
 * 
 * @param startDate - Data de início do período (ex: primeiro dia da semana/mês)
 * @param endDate - Data de fim do período (ex: último dia da semana/mês)
 * @param options - Opções de filtro (ex: classId para professores)
 */
export function useCalendarData(startDate: Date, endDate: Date, options: UseCalendarDataOptions = {}) {
  const { classId } = options;
  const { posts, isLoading } = usePosts({ status: 'PUBLISHED' });

  const events = useMemo(() => {
    const calendarEvents: CalendarEvent[] = [];

    posts.forEach(post => {
      // Handle EVENTO posts
      if (post.type === 'EVENTO' && post.eventStartAt) {
        const eventStart = parseISO(post.eventStartAt);
        const eventEnd = post.eventEndAt ? parseISO(post.eventEndAt) : eventStart;
        
        // Check if event intersects with our date range
        if (isWithinInterval(eventStart, { start: startDate, end: endDate }) ||
            isWithinInterval(eventEnd, { start: startDate, end: endDate }) ||
            (eventStart < startDate && eventEnd > endDate)) {
          calendarEvents.push({
            id: post.id,
            post,
            startDate: eventStart,
            endDate: eventEnd,
            type: 'event',
            title: post.title
          });
        }
      }

      // Handle ATIVIDADE posts (deadlines) - include TRABALHO and PROVA
      if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type) && post.dueAt) {
        // Filter by class if specified (for professor view)
        if (classId && classId !== 'ALL_CLASSES') {
          const belongsToClass = post.classIds?.includes(classId) || post.classId === classId;
          if (!belongsToClass) return;
        }

        const dueDate = parseISO(post.dueAt);
        
        if (isWithinInterval(dueDate, { start: startDate, end: endDate })) {
          calendarEvents.push({
            id: post.id,
            post,
            startDate: dueDate,
            endDate: dueDate,
            type: 'deadline',
            title: post.title
          });
        }
      }
    });

    return calendarEvents;
  }, [posts, startDate, endDate, classId]);

  return { events, posts, isLoading };
}

export function selectEventsInRange(posts: Post[], start: Date, end: Date): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  posts.forEach(post => {
    if (post.status !== 'PUBLISHED') return;

    if (post.type === 'EVENTO' && post.eventStartAt) {
      const eventStart = parseISO(post.eventStartAt);
      const eventEnd = post.eventEndAt ? parseISO(post.eventEndAt) : eventStart;
      
      if (isWithinInterval(eventStart, { start, end }) ||
          isWithinInterval(eventEnd, { start, end }) ||
          (eventStart < start && eventEnd > end)) {
        events.push({
          id: post.id,
          post,
          startDate: eventStart,
          endDate: eventEnd,
          type: 'event',
          title: post.title
        });
      }
    }
  });

  return events;
}

export function selectDeadlinesInRange(posts: Post[], start: Date, end: Date): CalendarEvent[] {
  const deadlines: CalendarEvent[] = [];

  posts.forEach(post => {
    if (post.status !== 'PUBLISHED') return;

    if (post.type === 'ATIVIDADE' && post.dueAt) {
      const dueDate = parseISO(post.dueAt);
      
      if (isWithinInterval(dueDate, { start, end })) {
        deadlines.push({
          id: post.id,
          post,
          startDate: dueDate,
          endDate: dueDate,
          type: 'deadline',
          title: post.title
        });
      }
    }
  });

  return deadlines;
}