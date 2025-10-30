/**
 * Calendar Providers - Aggregates all contexts needed for calendar functionality
 */

import React from 'react';
import { CalendarModalProvider } from '@/components/calendar/CalendarModalManager';

interface CalendarProvidersProps {
  children: React.ReactNode;
}

export function CalendarProviders({ children }: CalendarProvidersProps) {
  return (
    <CalendarModalProvider>
      {children}
    </CalendarModalProvider>
  );
}