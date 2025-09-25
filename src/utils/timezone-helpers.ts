import { format, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export class TimezoneHelpers {
  // Get user's local timezone
  static getUserTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  // Format date in user's local timezone
  static formatDateLocal(date: Date | string, pattern: string = 'dd/MM/yyyy'): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, pattern, { locale: ptBR });
  }

  // Format time in user's local timezone
  static formatTimeLocal(date: Date | string, pattern: string = 'HH:mm'): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, pattern, { locale: ptBR });
  }

  // Format full datetime in user's local timezone
  static formatDateTimeLocal(date: Date | string, pattern: string = "dd/MM/yyyy 'às' HH:mm"): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, pattern, { locale: ptBR });
  }

  // Get start of day in user's local timezone
  static getLocalStartOfDay(date: Date = new Date()): Date {
    return startOfDay(date);
  }

  // Create date with default event times (9:00 AM - 10:00 AM)
  static createDefaultEventTimes(date: Date, duration: number = 60): {
    startTime: string;
    endTime: string;
    startDate: string;
    endDate: string;
  } {
    const startHour = 9; // 9:00 AM
    const startMinute = 0;
    
    const eventStart = new Date(date);
    eventStart.setHours(startHour, startMinute, 0, 0);
    
    const eventEnd = new Date(eventStart);
    eventEnd.setMinutes(eventEnd.getMinutes() + duration);
    
    return {
      startTime: this.formatTimeLocal(eventStart),
      endTime: this.formatTimeLocal(eventEnd),
      startDate: this.formatDateLocal(date),
      endDate: this.formatDateLocal(eventEnd)
    };
  }

  // Get current date/time in local timezone for form defaults
  static getCurrentLocalDateTime(): {
    date: string;
    time: string;
  } {
    const now = new Date();
    return {
      date: this.formatDateLocal(now, 'yyyy-MM-dd'),
      time: this.formatTimeLocal(now)
    };
  }

  // Check if date is today in local timezone
  static isToday(date: Date | string): boolean {
    const targetDate = typeof date === 'string' ? parseISO(date) : date;
    const today = this.getLocalStartOfDay();
    const targetDay = this.getLocalStartOfDay(targetDate);
    
    return today.getTime() === targetDay.getTime();
  }

  // Get locale string for date inputs
  static getDateInputFormat(): string {
    return 'yyyy-MM-dd'; // HTML5 date input format
  }

  // Get locale string for time inputs  
  static getTimeInputFormat(): string {
    return 'HH:mm'; // HTML5 time input format
  }
}