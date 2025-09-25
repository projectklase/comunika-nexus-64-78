import { useMemo } from 'react';
import { usePosts } from './usePosts';
import { Post } from '@/types/post';
import { CalendarEvent } from './useCalendarData';
import { AdvancedFilters } from '@/components/calendar/AdvancedCalendarFilters';
import { isWithinInterval, parseISO, startOfWeek, endOfWeek, isAfter, isBefore } from 'date-fns';

interface UseAdvancedCalendarDataOptions {
  startDate: Date;
  endDate: Date;
  filters: AdvancedFilters;
}

export function useAdvancedCalendarData({ 
  startDate, 
  endDate, 
  filters 
}: UseAdvancedCalendarDataOptions) {
  const posts = usePosts({ status: 'PUBLISHED' });

  const events = useMemo(() => {
    const calendarEvents: CalendarEvent[] = [];
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

    // Filter posts based on advanced filters
    let filteredPosts = posts;

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filteredPosts = filteredPosts.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.body?.toLowerCase().includes(query) ||
        post.authorName.toLowerCase().includes(query)
      );
    }

    // Post type filters
    if (filters.postTypes.length > 0) {
      filteredPosts = filteredPosts.filter(post =>
        filters.postTypes.includes(post.type)
      );
    }

    // Author filters
    if (filters.authorNames.length > 0) {
      filteredPosts = filteredPosts.filter(post =>
        filters.authorNames.includes(post.authorName)
      );
    }

    // Class filters
    if (filters.classIds.length > 0) {
      filteredPosts = filteredPosts.filter(post => {
        if (post.audience === 'GLOBAL') return true;
        const postClasses = post.classIds || (post.classId ? [post.classId] : []);
        return postClasses.some(classId => filters.classIds.includes(classId));
      });
    }

    // Weight filters
    if (filters.hasWeight) {
      filteredPosts = filteredPosts.filter(post => {
        const weight = post.activityMeta?.peso;
        if (weight === undefined) return false;
        
        if (filters.minWeight !== undefined && weight < filters.minWeight) return false;
        if (filters.maxWeight !== undefined && weight > filters.maxWeight) return false;
        
        return true;
      });
    }

    // Attachments filter
    if (filters.hasAttachments) {
      filteredPosts = filteredPosts.filter(post =>
        post.attachments && post.attachments.length > 0
      );
    }

    // Process each filtered post
    filteredPosts.forEach(post => {
      // Handle EVENTO posts
      if (post.type === 'EVENTO' && post.eventStartAt && filters.events) {
        const eventStart = parseISO(post.eventStartAt);
        const eventEnd = post.eventEndAt ? parseISO(post.eventEndAt) : eventStart;
        
        // Check if event intersects with our date range
        if (isWithinInterval(eventStart, { start: startDate, end: endDate }) ||
            isWithinInterval(eventEnd, { start: startDate, end: endDate }) ||
            (eventStart < startDate && eventEnd > endDate)) {
          
          // Apply period filters
          let includeEvent = true;
          
          if (filters.thisWeek && !isWithinInterval(eventStart, { start: weekStart, end: weekEnd })) {
            includeEvent = false;
          }
          
          if (filters.upcoming && !isAfter(eventStart, now)) {
            includeEvent = false;
          }
          
          // Events can't be overdue, so skip overdue filter
          
          if (includeEvent) {
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
      }

      // Handle ATIVIDADE posts (deadlines) - include TRABALHO and PROVA
      if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type) && post.dueAt && filters.deadlines) {
        const dueDate = parseISO(post.dueAt);
        
        if (isWithinInterval(dueDate, { start: startDate, end: endDate })) {
          // Apply period filters
          let includeDeadline = true;
          
          if (filters.overdue && isAfter(dueDate, now)) {
            includeDeadline = false;
          }
          
          if (filters.thisWeek && !isWithinInterval(dueDate, { start: weekStart, end: weekEnd })) {
            includeDeadline = false;
          }
          
          if (filters.upcoming && isBefore(dueDate, now)) {
            includeDeadline = false;
          }
          
          if (includeDeadline) {
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
      }
    });

    return calendarEvents;
  }, [posts, startDate, endDate, filters]);

  // Count totals for UI
  const totalCount = useMemo(() => {
    return events.length;
  }, [events]);

  const eventCount = useMemo(() => {
    return events.filter(e => e.type === 'event').length;
  }, [events]);

  const deadlineCount = useMemo(() => {
    return events.filter(e => e.type === 'deadline').length;
  }, [events]);

  return { 
    events, 
    posts,
    totalCount,
    eventCount,
    deadlineCount
  };
}