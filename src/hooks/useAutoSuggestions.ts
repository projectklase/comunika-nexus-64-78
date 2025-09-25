import { useState, useMemo } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { useActivityPriority } from '@/hooks/useActivityPriority';
import { useConflictDetector } from '@/hooks/useConflictDetector';
import { useStudentPlannerStore, PlannedBlock } from '@/stores/studentPlannerStore';
import { useNexus } from '@/hooks/useNexus';

export interface SuggestedBlock {
  id: string;
  postId: string;
  activityTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'study' | 'execution' | 'review';
  priority: number;
  stepLabel?: string;
}

export function useAutoSuggestions() {
  const [suggestedBlocks, setSuggestedBlocks] = useState<SuggestedBlock[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { getTopPriorityActivities } = useActivityPriority();
  const { checkBlockConflict } = useConflictDetector();
  const { preferences, suggestTimeSlots, addBlock } = useStudentPlannerStore();
  const { activities, trails } = useNexus();

  const generateWeeklySuggestions = async (): Promise<SuggestedBlock[]> => {
    setIsGenerating(true);
    
    try {
      const topActivities = getTopPriorityActivities(3);
      const suggestions: SuggestedBlock[] = [];
      
      // Get current week dates
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
      const weekDays = Array.from({ length: 7 }, (_, i) => 
        format(addDays(weekStart, i), 'yyyy-MM-dd')
      );

      for (const priorityInfo of topActivities) {
        const activity = activities.find(a => a.id === priorityInfo.activityId);
        if (!activity) continue;

        const trail = trails[priorityInfo.activityId];
        const incompleteSteps = trail ? trail.steps.filter(s => !s.completed) : [];
        
        // Determine how many blocks to suggest (2-4 based on priority)
        const blockCount = Math.max(2, Math.min(4, Math.ceil(priorityInfo.score * 4)));
        
        let blocksCreated = 0;
        
        for (const day of weekDays) {
          if (blocksCreated >= blockCount) break;
          
          // Skip weekends if not preferred
          const dayOfWeek = new Date(day).getDay();
          if ((dayOfWeek === 0 || dayOfWeek === 6) && !preferences.preferredStudyTime.includes('weekend')) {
            continue;
          }
          
          // Get suggested time slots for this day
          const duration = preferences.blockSize;
          const timeSlots = suggestTimeSlots(day, duration);
          
          for (const slot of timeSlots) {
            if (blocksCreated >= blockCount) break;
            
            // Check for conflicts
            const conflict = checkBlockConflict(day, slot.startTime, slot.endTime);
            if (conflict.hasConflict) continue;
            
            // Determine block type and step
            const stepIndex = blocksCreated % Math.max(1, incompleteSteps.length);
            const step = incompleteSteps[stepIndex];
            
            let blockType: 'study' | 'execution' | 'review' = 'study';
            let stepLabel = 'Estudar';
            
            if (step) {
              if (step.description.toLowerCase().includes('fazer') || 
                  step.description.toLowerCase().includes('resolver')) {
                blockType = 'execution';
                stepLabel = 'Resolver';
              } else if (step.description.toLowerCase().includes('revisar') ||
                        step.description.toLowerCase().includes('verificar')) {
                blockType = 'review';
                stepLabel = 'Revisar';
              } else {
                stepLabel = step.description;
              }
            }
            
            const suggestion: SuggestedBlock = {
              id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              postId: activity.id,
              activityTitle: activity.title,
              date: day,
              startTime: slot.startTime,
              endTime: slot.endTime,
              type: blockType,
              priority: priorityInfo.score,
              stepLabel
            };
            
            suggestions.push(suggestion);
            blocksCreated++;
          }
        }
      }
      
      setSuggestedBlocks(suggestions);
      return suggestions;
      
    } finally {
      setIsGenerating(false);
    }
  };

  const acceptAllSuggestions = () => {
    suggestedBlocks.forEach(suggestion => {
      addBlock({
        postId: suggestion.postId,
        date: suggestion.date,
        startTime: suggestion.startTime,
        endTime: suggestion.endTime,
        type: suggestion.type,
        turmaId: undefined
      });
    });
    
    setSuggestedBlocks([]);
  };

  const acceptSuggestion = (suggestionId: string) => {
    const suggestion = suggestedBlocks.find(s => s.id === suggestionId);
    if (!suggestion) return;
    
    addBlock({
      postId: suggestion.postId,
      date: suggestion.date,
      startTime: suggestion.startTime,
      endTime: suggestion.endTime,
      type: suggestion.type,
      turmaId: undefined
    });
    
    setSuggestedBlocks(prev => prev.filter(s => s.id !== suggestionId));
  };

  const discardAllSuggestions = () => {
    setSuggestedBlocks([]);
  };

  const discardSuggestion = (suggestionId: string) => {
    setSuggestedBlocks(prev => prev.filter(s => s.id !== suggestionId));
  };

  // Break activity into steps and create blocks
  const breakIntoSteps = (activityId: string): SuggestedBlock[] => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return [];

    const trail = trails[activityId];
    const steps = trail?.steps || [];
    
    // Default steps if no trail exists
    const defaultSteps = [
      { label: 'Ler e entender', type: 'study' as const },
      { label: 'Resolver/Fazer', type: 'execution' as const },
      { label: 'Revisar', type: 'review' as const }
    ];
    
    const stepsToUse = steps.length > 0 ? 
      steps.filter(s => !s.completed).map(s => ({
        label: s.description,
        type: s.description.toLowerCase().includes('fazer') ? 'execution' as const :
              s.description.toLowerCase().includes('revisar') ? 'review' as const : 'study' as const
      })) : defaultSteps;

    const suggestions: SuggestedBlock[] = [];
    const duration = preferences.blockSize;
    
    // Try to create blocks for next few days
    for (let dayOffset = 0; dayOffset < 5 && suggestions.length < stepsToUse.length; dayOffset++) {
      const targetDate = addDays(new Date(), dayOffset);
      const dateStr = format(targetDate, 'yyyy-MM-dd');
      
      const availableSlots = suggestTimeSlots(dateStr, duration);
      
      for (const slot of availableSlots) {
        if (suggestions.length >= stepsToUse.length) break;
        
        const conflict = checkBlockConflict(dateStr, slot.startTime, slot.endTime);
        if (conflict.hasConflict) continue;
        
        const stepIndex = suggestions.length;
        const step = stepsToUse[stepIndex];
        
        suggestions.push({
          id: `step-${Date.now()}-${stepIndex}`,
          postId: activityId,
          activityTitle: activity.title,
          date: dateStr,
          startTime: slot.startTime,
          endTime: slot.endTime,
          type: step.type,
          priority: 1,
          stepLabel: step.label
        });
        
        break; // One block per day
      }
    }
    
    return suggestions;
  };

  return {
    suggestedBlocks,
    isGenerating,
    generateWeeklySuggestions,
    acceptAllSuggestions,
    acceptSuggestion,
    discardAllSuggestions,
    discardSuggestion,
    breakIntoSteps
  };
}