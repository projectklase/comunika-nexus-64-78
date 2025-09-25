import { useMemo } from 'react';
import { parseISO, differenceInDays } from 'date-fns';
import { useNexus } from '@/hooks/useNexus';
import { useStudentPlannerStore } from '@/stores/studentPlannerStore';

export interface ActivityPriority {
  activityId: string;
  score: number;
  urgency: number;
  weight: number;
  backlog: number;
  risk: 'low' | 'medium' | 'high';
  daysUntilDue: number;
}

export function useActivityPriority() {
  const { activities, trails, getActivityUrgency } = useNexus();
  const { plannedBlocks } = useStudentPlannerStore();

  const priorityScores = useMemo(() => {
    return activities.map(activity => {
      const urgencyInfo = getActivityUrgency(activity.id);
      const trail = trails[activity.id];
      const activityBlocks = plannedBlocks.filter(block => block.postId === activity.id);
      
      // Calculate urgency (0-1, higher = more urgent)
      const daysUntilDue = activity.dueAt ? 
        Math.max(0, differenceInDays(parseISO(activity.dueAt), new Date())) : 999;
      const urgency = daysUntilDue === 0 ? 1 : Math.max(0, 1 - (daysUntilDue / 30));

      // Calculate weight (0-1, based on post weight or default)
      const weight = activity.activityMeta?.peso ? Math.min(activity.activityMeta.peso / 5, 1) : 0.5;

      // Calculate backlog (0-1, based on planned vs needed blocks)
      const suggestedBlocksCount = trail ? 
        Math.ceil(trail.steps.filter(s => !s.completed).length / 2) : 3;
      const plannedBlocksCount = activityBlocks.length;
      const backlog = suggestedBlocksCount === 0 ? 0 : 
        Math.max(0, 1 - (plannedBlocksCount / suggestedBlocksCount));

      // Priority formula: 60% urgency, 30% weight, 10% backlog
      const score = Math.min(1, 0.6 * urgency + 0.3 * weight + 0.1 * backlog);

      // Risk assessment
      let risk: 'low' | 'medium' | 'high' = 'low';
      if (score >= 0.8 || daysUntilDue <= 1) risk = 'high';
      else if (score >= 0.6 || daysUntilDue <= 3) risk = 'medium';

      return {
        activityId: activity.id,
        score,
        urgency,
        weight,
        backlog,
        risk,
        daysUntilDue
      };
    }).sort((a, b) => b.score - a.score);
  }, [activities, trails, plannedBlocks, getActivityUrgency]);

  const getActivityPriority = (activityId: string): ActivityPriority | undefined => {
    return priorityScores.find(p => p.activityId === activityId);
  };

  const getHighRiskActivities = (): ActivityPriority[] => {
    return priorityScores.filter(p => p.risk === 'high');
  };

  const getTopPriorityActivities = (count: number = 3): ActivityPriority[] => {
    return priorityScores.slice(0, count);
  };

  return {
    priorityScores,
    getActivityPriority,
    getHighRiskActivities,
    getTopPriorityActivities
  };
}