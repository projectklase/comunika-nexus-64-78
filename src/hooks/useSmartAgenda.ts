import { useMemo } from 'react';
import { parseISO, addMinutes, format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { useNexusStore } from '@/stores/nexus-store';
import { usePosts } from '@/hooks/usePosts';
import { StudyBlock } from '@/types/nexus';

export function useSmartAgenda() {
  const store = useNexusStore();
  const { posts: allPosts } = usePosts({ status: 'PUBLISHED' });

  const activities = useMemo(() => {
    return allPosts.filter(post => 
      ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type) && 
      post.dueAt
    );
  }, [allPosts]);

  // Get available time slots for study based on user preferences
  const getAvailableTimeSlots = (targetDate: Date, duration: number): Date[] => {
    const slots: Date[] = [];
    const prefs = store.preferences.studyTimeWindows;
    
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);
    
    // Morning slots (6-12h)
    if (prefs.morning) {
      const morningStart = new Date(dayStart);
      morningStart.setHours(6, 0, 0, 0);
      const morningEnd = new Date(dayStart);
      morningEnd.setHours(12, 0, 0, 0);
      
      for (let time = morningStart; time < morningEnd; time = addMinutes(time, 30)) {
        const slotEnd = addMinutes(time, duration);
        if (slotEnd <= morningEnd) {
          slots.push(new Date(time));
        }
      }
    }
    
    // Afternoon slots (12-18h)
    if (prefs.afternoon) {
      const afternoonStart = new Date(dayStart);
      afternoonStart.setHours(12, 0, 0, 0);
      const afternoonEnd = new Date(dayStart);
      afternoonEnd.setHours(18, 0, 0, 0);
      
      for (let time = afternoonStart; time < afternoonEnd; time = addMinutes(time, 30)) {
        const slotEnd = addMinutes(time, duration);
        if (slotEnd <= afternoonEnd) {
          slots.push(new Date(time));
        }
      }
    }
    
    // Evening slots (18-24h)
    if (prefs.evening) {
      const eveningStart = new Date(dayStart);
      eveningStart.setHours(18, 0, 0, 0);
      const eveningEnd = new Date(dayStart);
      eveningEnd.setHours(24, 0, 0, 0);
      
      for (let time = eveningStart; time < eveningEnd; time = addMinutes(time, 30)) {
        const slotEnd = addMinutes(time, duration);
        if (slotEnd <= eveningEnd) {
          slots.push(new Date(time));
        }
      }
    }
    
    return slots;
  };

  // Check if a time slot conflicts with existing study blocks
  const hasConflict = (startTime: Date, duration: number): boolean => {
    const slotEnd = addMinutes(startTime, duration);
    
    return store.studyBlocks.some(block => {
      if (block.status === 'completed' || block.status === 'skipped') {
        return false;
      }
      
      const blockStart = parseISO(block.startTime);
      const blockEnd = parseISO(block.endTime);
      
      return (
        isWithinInterval(startTime, { start: blockStart, end: blockEnd }) ||
        isWithinInterval(slotEnd, { start: blockStart, end: blockEnd }) ||
        isWithinInterval(blockStart, { start: startTime, end: slotEnd })
      );
    });
  };

  // Suggest study blocks for an activity
  const suggestStudyBlocks = (activityId: string): Array<{
    startTime: Date;
    duration: number;
    type: 'study' | 'focus' | 'review';
  }> => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity?.dueAt) return [];

    const trail = store.trails[activityId];
    if (!trail) return [];

    const now = new Date();
    const dueDate = parseISO(activity.dueAt);
    
    // Calculate how much time we need
    const remainingSteps = trail.steps.filter(step => !step.completed);
    const totalEstimatedTime = remainingSteps.reduce((total, step) => total + step.estimatedMinutes, 0);
    
    // Suggest blocks between now and due date
    const suggestions: Array<{
      startTime: Date;
      duration: number;
      type: 'study' | 'focus' | 'review';
    }> = [];
    
    let currentDate = new Date(now);
    let remainingTime = totalEstimatedTime;
    
    while (remainingTime > 0 && currentDate < dueDate) {
      const blockDuration = Math.min(
        remainingTime,
        store.preferences.preferredFocusDuration
      );
      
      const availableSlots = getAvailableTimeSlots(currentDate, blockDuration);
      const freeSlot = availableSlots.find(slot => !hasConflict(slot, blockDuration));
      
      if (freeSlot) {
        const blockType = remainingTime <= blockDuration * 1.5 ? 'review' : 'study';
        
        suggestions.push({
          startTime: freeSlot,
          duration: blockDuration,
          type: blockType
        });
        
        remainingTime -= blockDuration;
      }
      
      // Move to next day if no slots available today
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
    }
    
    return suggestions;
  };

  // Schedule a study block
  const scheduleStudyBlock = (activityId: string, startTime: Date, duration: number) => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;

    const trail = store.trails[activityId];
    const nextStep = trail ? store.getNextStep(activityId) : null;

    const endTime = addMinutes(startTime, duration);

    store.scheduleStudyBlock({
      activityId,
      stepId: nextStep?.id,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      type: 'study',
      status: 'scheduled'
    });
  };

  // Postpone a study block to the next available slot
  const postponeStudyBlock = (blockId: string) => {
    const block = store.studyBlocks.find(b => b.id === blockId);
    if (!block) return;

    const currentStart = parseISO(block.startTime);
    const nextDay = new Date(currentStart);
    nextDay.setDate(nextDay.getDate() + 1);

    const availableSlots = getAvailableTimeSlots(nextDay, block.duration);
    const freeSlot = availableSlots.find(slot => !hasConflict(slot, block.duration));

    if (freeSlot) {
      store.postponeStudyBlock(blockId, freeSlot.toISOString());
    }
  };

  // Get today's scheduled blocks
  const getTodayBlocks = (): StudyBlock[] => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    return store.studyBlocks.filter(block => {
      const blockStart = parseISO(block.startTime);
      return blockStart >= todayStart && blockStart <= todayEnd;
    });
  };

  // Get next scheduled block
  const getNextBlock = (): StudyBlock | null => {
    const now = new Date();
    const upcomingBlocks = store.studyBlocks
      .filter(block => {
        const blockStart = parseISO(block.startTime);
        return blockStart > now && block.status === 'scheduled';
      })
      .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());

    return upcomingBlocks[0] || null;
  };

  return {
    suggestStudyBlocks,
    scheduleStudyBlock,
    postponeStudyBlock,
    getTodayBlocks,
    getNextBlock,
    hasConflict
  };
}