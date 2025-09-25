import { NavigateFunction } from 'react-router-dom';
import { NormalizedCalendarEvent } from './calendar-events';

interface ActivityDrawerState {
  isOpen: boolean;
  postId: string | null;
  classId?: string;
  mode?: 'calendar' | 'feed';
  type?: string;
  subtype?: string;
  status?: string;
}

// Simple store for activity drawer state
class ActivityDrawerStore {
  private state: ActivityDrawerState = {
    isOpen: false,
    postId: null,
  };
  
  private listeners: Set<() => void> = new Set();

  getState() {
    return this.state;
  }

  setState(newState: Partial<ActivityDrawerState>) {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  open(params: {
    postId: string;
    classId?: string;
    mode?: 'calendar' | 'feed';
    type?: string;
    subtype?: string;
    status?: string;
  }) {
    this.setState({
      isOpen: true,
      postId: params.postId,
      classId: params.classId,
      mode: params.mode || 'calendar',
      type: params.type,
      subtype: params.subtype,
      status: params.status,
    });
  }

  close() {
    this.setState({
      isOpen: false,
      postId: null,
      classId: undefined,
      mode: undefined,
      type: undefined,
      subtype: undefined,
      status: undefined,
    });
  }
}

export const activityDrawerStore = new ActivityDrawerStore();

// Day drawer store to control the old sidebar
class DayDrawerStore {
  private isOpen = false;
  private listeners: Set<() => void> = new Set();

  getState() {
    return { isOpen: this.isOpen };
  }

  setState(isOpen: boolean) {
    this.isOpen = isOpen;
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  close() {
    this.setState(false);
  }
}

export const dayDrawerStore = new DayDrawerStore();

export function openActivityDrawerFromCalendar(
  eventData: NormalizedCalendarEvent,
  navigate?: NavigateFunction,
  options?: { updateUrl?: boolean }
) {
  return (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Close the old day drawer
    dayDrawerStore.close();

    // Open the activity drawer
    activityDrawerStore.open({
      postId: eventData.postId,
      classId: eventData.classId,
      mode: 'calendar',
      type: eventData.type,
      subtype: eventData.subtype,
      status: eventData.status,
    });

    // Update URL if requested and navigate function is provided
    if (options?.updateUrl && navigate) {
      const params = new URLSearchParams(window.location.search);
      params.set('drawer', 'activity');
      params.set('postId', eventData.postId);
      
      if (eventData.classId && eventData.classId !== 'ALL_CLASSES') {
        params.set('classId', eventData.classId);
      }
      
      const currentPath = window.location.pathname;
      navigate(`${currentPath}?${params.toString()}`, { replace: true });
    }
  };
}

export function closeActivityDrawer(navigate?: NavigateFunction) {
  activityDrawerStore.close();
  
  // Remove drawer params from URL if navigate function is provided
  if (navigate) {
    const params = new URLSearchParams(window.location.search);
    params.delete('drawer');
    params.delete('postId');
    params.delete('classId');
    
    const currentPath = window.location.pathname;
    const queryString = params.toString();
    navigate(queryString ? `${currentPath}?${queryString}` : currentPath, { replace: true });
  }
}

export function restoreActivityDrawerFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const drawer = params.get('drawer');
  const postId = params.get('postId');
  const classId = params.get('classId');
  
  if (drawer === 'activity' && postId) {
    activityDrawerStore.open({
      postId,
      classId: classId || undefined,
      mode: 'calendar',
    });
    return true;
  }
  
  return false;
}