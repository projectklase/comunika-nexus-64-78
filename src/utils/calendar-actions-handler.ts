/**
 * Unified Calendar Actions Handler
 * Centralized logic for all calendar navigation actions
 */

import { NavigateFunction } from 'react-router-dom';
import { UnifiedCalendarNavigation } from './calendar-navigation-unified';
import { Post } from '@/types/post';
import { NormalizedCalendarEvent } from './calendar-events';
import { UserRole } from '@/types/auth';

export interface CalendarActionOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
}

export class CalendarActionsHandler {
  
  /**
   * Extract Post data from either NormalizedCalendarEvent or Post
   */
  static extractPostData(event: NormalizedCalendarEvent | Post) {
    if ('meta' in event) {
      // It's a NormalizedCalendarEvent
      return {
        id: event.postId,
        type: event.subtype,
        title: event.meta.title,
        eventStartAt: event.meta.eventStartAt,
        dueAt: event.meta.dueAt,
        classId: event.classId,
        classIds: event.classIds,
      };
    }
    // It's a Post
    return {
      id: event.id,
      type: event.type,
      title: event.title,
      eventStartAt: event.eventStartAt,
      dueAt: event.dueAt,
      classId: event.classId,
      classIds: event.classIds,
    };
  }

  /**
   * Navigate to calendar for any event/activity
   */
  static navigateToCalendar(
    navigate: NavigateFunction,
    userRole: UserRole,
    event: NormalizedCalendarEvent | Post,
    options: CalendarActionOptions = {}
  ): void {
    try {
      const postData = this.extractPostData(event);
      
      // Determine target date
      let targetDate: string | undefined;
      if (postData.type === 'EVENTO' && postData.eventStartAt) {
        targetDate = postData.eventStartAt;
      } else if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(postData.type) && postData.dueAt) {
        targetDate = postData.dueAt;
      }

      if (!targetDate) {
        throw new Error('No date available for calendar navigation');
      }

      // Build navigation parameters
      const params = {
        date: targetDate,
        postId: postData.id,
        classId: postData.classId !== 'ALL_CLASSES' ? postData.classId : undefined,
        view: 'month' as const,
        highlightPost: true,
        openDayModal: true
      };

      // Navigate using unified system
      const url = UnifiedCalendarNavigation.buildCalendarUrl(userRole, params);
      navigate(url);
      
      options.onSuccess?.();
    } catch (error) {
      console.error('Calendar navigation error:', error);
      const errorObj = error instanceof Error ? error : new Error('Unknown navigation error');
      options.onError?.(errorObj);
    }
  }

  /**
   * Generate .ics file for external calendar apps
   */
  static generateICSFile(event: NormalizedCalendarEvent | Post): void {
    try {
      const postData = this.extractPostData(event);
      
      let startDate: Date, endDate: Date;
      
      if (postData.type === 'EVENTO' && postData.eventStartAt) {
        startDate = new Date(postData.eventStartAt);
        endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour default
      } else if (postData.dueAt) {
        startDate = new Date(postData.dueAt);
        endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour
      } else {
        throw new Error('No date available for calendar export');
      }

      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//KLASE//Calendar Event//PT',
        'BEGIN:VEVENT',
        `UID:${postData.id}@klase.app`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `SUMMARY:${postData.title}`,
        `DESCRIPTION:Evento do KLASE - ${postData.title}`,
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${postData.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('ICS generation error:', error);
      throw error;
    }
  }

  /**
   * Copy link to event
   */
  static async copyEventLink(
    event: NormalizedCalendarEvent | Post,
    userRole: UserRole
  ): Promise<void> {
    try {
      const postData = this.extractPostData(event);
      const baseUrl = window.location.origin;
      
      // Build appropriate URL based on post type and user role
      let targetUrl: string;
      
      if (postData.eventStartAt || postData.dueAt) {
        const params = {
          date: postData.eventStartAt || postData.dueAt,
          postId: postData.id,
          classId: postData.classId !== 'ALL_CLASSES' ? postData.classId : undefined,
          view: 'month' as const,
          highlightPost: true
        };
        
        const calendarUrl = UnifiedCalendarNavigation.buildCalendarUrl(userRole, params);
        targetUrl = `${baseUrl}${calendarUrl}`;
      } else {
        // Fallback to feed
        targetUrl = `${baseUrl}/feed?postId=${postData.id}`;
      }

      await navigator.clipboard.writeText(targetUrl);
    } catch (error) {
      console.error('Copy link error:', error);
      throw error;
    }
  }
}