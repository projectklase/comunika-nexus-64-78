import { useMemo } from 'react';
import { parseISO } from 'date-fns';
import { useNexusStore } from '@/stores/nexus-store';
import { usePosts } from '@/hooks/usePosts';
import { UrgencyInfo, UrgencyLevel } from '@/types/nexus';

export function useNexus() {
  const store = useNexusStore();
  const { posts: allPosts } = usePosts({ status: 'PUBLISHED' });

  // Get all activities (posts that are activities)
  const activities = useMemo(() => {
    return allPosts.filter(post => 
      ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type) && 
      post.dueAt
    );
  }, [allPosts]);

  // Ensure trails exist for all activities
  useMemo(() => {
    activities.forEach(activity => {
      if (!store.trails[activity.id]) {
        store.createTrail(activity.id, activity.title, activity.body);
      }
    });
  }, [activities, store]);

  // Calculate urgency for activities
  const getActivityUrgency = (activityId: string): UrgencyInfo => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity?.dueAt) {
      return { level: 'low', hoursUntilDue: Infinity, message: 'Sem prazo definido' };
    }

    const now = new Date();
    const dueDate = parseISO(activity.dueAt);
    const hoursUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    let level: UrgencyLevel;
    let message: string;

    if (hoursUntilDue < 0) {
      level = 'critical';
      message = 'Prazo vencido';
    } else if (hoursUntilDue <= 6) {
      level = 'critical';
      message = 'Prazo crítico - menos de 6h';
    } else if (hoursUntilDue <= 24) {
      level = 'high';
      message = 'Urgente - menos de 24h';
    } else if (hoursUntilDue <= 48) {
      level = 'medium';
      message = 'Importante - menos de 48h';
    } else {
      level = 'low';
      message = 'No prazo';
    }

    return { level, hoursUntilDue, message };
  };

  // Get the most urgent activity
  const getMostUrgentActivity = () => {
    const urgentActivities = activities
      .map(activity => ({
        activity,
        urgency: getActivityUrgency(activity.id),
        progress: store.getTrailProgress(activity.id)
      }))
      .filter(item => item.progress < 100) // Only incomplete activities
      .sort((a, b) => {
        // Sort by urgency level first, then by time until due
        const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aUrgencyValue = urgencyOrder[a.urgency.level];
        const bUrgencyValue = urgencyOrder[b.urgency.level];
        
        if (aUrgencyValue !== bUrgencyValue) {
          return bUrgencyValue - aUrgencyValue; // Higher urgency first
        }
        
        return a.urgency.hoursUntilDue - b.urgency.hoursUntilDue; // Sooner due date first
      });

    return urgentActivities[0] || null;
  };

  // Get today's activities
  const getTodayActivities = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return activities.filter(activity => {
      if (!activity.dueAt) return false;
      const dueDate = parseISO(activity.dueAt);
      return dueDate >= today && dueDate < tomorrow;
    });
  };

  // Get this week's activities
  const getWeekActivities = () => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return activities.filter(activity => {
      if (!activity.dueAt) return false;
      const dueDate = parseISO(activity.dueAt);
      return dueDate >= now && dueDate <= weekFromNow;
    });
  };

  // Get overall NEXUS status
  const getNexusStatus = () => {
    const mostUrgent = getMostUrgentActivity();
    const todayCount = getTodayActivities().length;
    const weekCount = getWeekActivities().length;
    const activeSession = store.activeFocusSession;

    return {
      mostUrgentActivity: mostUrgent,
      todayCount,
      weekCount,
      hasActiveFocus: !!activeSession,
      nextStep: mostUrgent ? store.getNextStep(mostUrgent.activity.id) : null
    };
  };

  return {
    // Store methods
    ...store,
    
    // Computed values
    activities,
    getActivityUrgency,
    getMostUrgentActivity,
    getTodayActivities,
    getWeekActivities,
    getNexusStatus
  };
}