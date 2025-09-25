import { memo } from 'react';

export interface OptimisticUpdate<T> {
  id: string;
  data: T;
  timestamp: number;
}

export interface OptimisticUpdateManager<T> {
  add: (id: string, data: T) => void;
  remove: (id: string) => void;
  get: (id: string) => OptimisticUpdate<T> | undefined;
  getAll: () => OptimisticUpdate<T>[];
  clear: () => void;
}

export function createOptimisticUpdateManager<T>(): OptimisticUpdateManager<T> {
  const updates = new Map<string, OptimisticUpdate<T>>();

  return {
    add: (id: string, data: T) => {
      updates.set(id, {
        id,
        data,
        timestamp: Date.now()
      });
    },
    
    remove: (id: string) => {
      updates.delete(id);
    },
    
    get: (id: string) => {
      return updates.get(id);
    },
    
    getAll: () => {
      return Array.from(updates.values());
    },
    
    clear: () => {
      updates.clear();
    }
  };
}

// Memoized component wrapper for better performance
export const MemoizedComponent = memo;

// Performance monitoring utilities
export const performanceMonitor = {
  startTiming: (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      performance.mark(`${label}-start`);
    }
  },
  
  endTiming: (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
      
      const measure = performance.getEntriesByName(label)[0];
      if (measure && measure.duration > 100) {
        console.warn(`Slow operation detected: ${label} took ${measure.duration.toFixed(2)}ms`);
      }
    }
  }
};

// Debounced update utility for better performance
export function createDebouncedUpdater<T>(
  updateFunction: (data: T) => Promise<void>,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout;
  let pendingUpdates: T[] = [];
  
  return (data: T) => {
    pendingUpdates.push(data);
    
    clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      const updatesToProcess = [...pendingUpdates];
      pendingUpdates = [];
      
      // Process all updates at once for better performance
      for (const update of updatesToProcess) {
        try {
          await updateFunction(update);
        } catch (error) {
          console.error('Debounced update failed:', error);
        }
      }
    }, delay);
  };
}