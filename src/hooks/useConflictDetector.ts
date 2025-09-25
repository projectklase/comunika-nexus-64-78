import { useMemo } from 'react';
import { parseISO, isSameDay, isWithinInterval } from 'date-fns';
import { useStudentPlannerStore, PlannedBlock } from '@/stores/studentPlannerStore';
import { usePosts } from '@/hooks/usePosts';

export interface ConflictInfo {
  hasConflict: boolean;
  conflictingBlocks: PlannedBlock[];
  conflictingEvents: any[]; // turma events
  nextAvailableSlot?: { date: string; startTime: string; endTime: string };
}

export function useConflictDetector() {
  const { plannedBlocks, hasConflict, suggestTimeSlots } = useStudentPlannerStore();
  const allPosts = usePosts({ status: 'PUBLISHED' });

  // Get class events (EVENTO type posts)
  const classEvents = useMemo(() => {
    return allPosts.filter(post => post.type === 'EVENTO' && post.eventStartAt);
  }, [allPosts]);

  const checkBlockConflict = (
    date: string, 
    startTime: string, 
    endTime: string, 
    excludeBlockId?: string
  ): ConflictInfo => {
    const conflictingBlocks = plannedBlocks.filter(block => {
      if (excludeBlockId && block.id === excludeBlockId) return false;
      if (block.date !== date) return false;

      const blockStart = parseTime(block.startTime);
      const blockEnd = parseTime(block.endTime);
      const newStart = parseTime(startTime);
      const newEnd = parseTime(endTime);

      return (newStart < blockEnd && newEnd > blockStart);
    });

    // Check class events conflict
    const targetDate = new Date(date);
    const conflictingEvents = classEvents.filter(event => {
      if (!event.eventStartAt) return false;
      
      const eventStart = parseISO(event.eventStartAt);
      if (!isSameDay(eventStart, targetDate)) return false;

      // Use eventEndAt or assume 1-hour duration
      const eventEnd = event.eventEndAt ? 
        parseISO(event.eventEndAt) : 
        new Date(eventStart.getTime() + 60 * 60 * 1000);
      
      const blockStart = new Date(targetDate);
      const [hours, minutes] = startTime.split(':').map(Number);
      blockStart.setHours(hours, minutes, 0, 0);
      
      const blockEnd = new Date(targetDate);
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      blockEnd.setHours(endHours, endMinutes, 0, 0);

      return isWithinInterval(eventStart, { start: blockStart, end: blockEnd }) ||
             isWithinInterval(eventEnd, { start: blockStart, end: blockEnd }) ||
             isWithinInterval(blockStart, { start: eventStart, end: eventEnd });
    });

    const hasAnyConflict = conflictingBlocks.length > 0 || conflictingEvents.length > 0;

    // Find next available slot if there's a conflict
    let nextAvailableSlot;
    if (hasAnyConflict) {
      const duration = parseTime(endTime) - parseTime(startTime);
      const suggestions = suggestTimeSlots(date, duration);
      
      if (suggestions.length === 0) {
        // Try next day
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDaySuggestions = suggestTimeSlots(
          nextDay.toISOString().split('T')[0], 
          duration
        );
        if (nextDaySuggestions.length > 0) {
          nextAvailableSlot = {
            date: nextDay.toISOString().split('T')[0],
            startTime: nextDaySuggestions[0].startTime,
            endTime: nextDaySuggestions[0].endTime
          };
        }
      } else {
        nextAvailableSlot = {
          date,
          startTime: suggestions[0].startTime,
          endTime: suggestions[0].endTime
        };
      }
    }

    return {
      hasConflict: hasAnyConflict,
      conflictingBlocks,
      conflictingEvents,
      nextAvailableSlot
    };
  };

  const moveBlockToNextSlot = (blockId: string): boolean => {
    const block = plannedBlocks.find(b => b.id === blockId);
    if (!block) return false;

    const duration = parseTime(block.endTime) - parseTime(block.startTime);
    const currentDate = new Date(block.date);
    
    // Try same day first
    let suggestions = suggestTimeSlots(block.date, duration);
    suggestions = suggestions.filter(slot => {
      const conflict = checkBlockConflict(block.date, slot.startTime, slot.endTime, blockId);
      return !conflict.hasConflict;
    });

    if (suggestions.length > 0) {
      const { updateBlock } = useStudentPlannerStore.getState();
      updateBlock(blockId, {
        startTime: suggestions[0].startTime,
        endTime: suggestions[0].endTime
      });
      return true;
    }

    // Try next day
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];
    
    suggestions = suggestTimeSlots(nextDayStr, duration);
    suggestions = suggestions.filter(slot => {
      const conflict = checkBlockConflict(nextDayStr, slot.startTime, slot.endTime, blockId);
      return !conflict.hasConflict;
    });

    if (suggestions.length > 0) {
      const { updateBlock } = useStudentPlannerStore.getState();
      updateBlock(blockId, {
        date: nextDayStr,
        startTime: suggestions[0].startTime,
        endTime: suggestions[0].endTime
      });
      return true;
    }

    return false;
  };

  const smartSnooze = (blockId: string, activityDueDate?: string): boolean => {
    const block = plannedBlocks.find(b => b.id === blockId);
    if (!block) return false;

    const duration = parseTime(block.endTime) - parseTime(block.startTime);
    const dueDate = activityDueDate ? parseISO(activityDueDate) : null;
    
    // Start from next day
    let currentDay = new Date(block.date);
    currentDay.setDate(currentDay.getDate() + 1);
    
    // Try up to 7 days or until due date
    for (let i = 0; i < 7; i++) {
      if (dueDate && currentDay > dueDate) {
        // Would exceed due date
        return false;
      }

      const dayStr = currentDay.toISOString().split('T')[0];
      let suggestions = suggestTimeSlots(dayStr, duration);
      suggestions = suggestions.filter(slot => {
        const conflict = checkBlockConflict(dayStr, slot.startTime, slot.endTime, blockId);
        return !conflict.hasConflict;
      });

      if (suggestions.length > 0) {
        const { updateBlock } = useStudentPlannerStore.getState();
        updateBlock(blockId, {
          date: dayStr,
          startTime: suggestions[0].startTime,
          endTime: suggestions[0].endTime
        });
        return true;
      }

      currentDay.setDate(currentDay.getDate() + 1);
    }

    return false;
  };

  return {
    checkBlockConflict,
    moveBlockToNextSlot,
    smartSnooze
  };
}

// Helper function
const parseTime = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};