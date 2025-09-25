import { useState, useEffect } from 'react';
import { activityDrawerStore, dayDrawerStore } from '@/utils/activity-drawer-handler';

export function useActivityDrawerState() {
  const [state, setState] = useState(activityDrawerStore.getState());

  useEffect(() => {
    const unsubscribe = activityDrawerStore.subscribe(() => {
      setState(activityDrawerStore.getState());
    });
    return unsubscribe;
  }, []);

  return state;
}

export function useDayDrawerState() {
  const [state, setState] = useState(dayDrawerStore.getState());

  useEffect(() => {
    const unsubscribe = dayDrawerStore.subscribe(() => {
      setState(dayDrawerStore.getState());
    });
    return unsubscribe;
  }, []);

  return state;
}