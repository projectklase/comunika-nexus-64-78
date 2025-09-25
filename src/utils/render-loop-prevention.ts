/**
 * Render loop prevention utilities
 * Helps prevent Maximum update depth exceeded errors
 */

import React, { useRef, useCallback, useEffect } from 'react';

/**
 * Debounced state updater to prevent rapid state changes
 */
export function useStableCallback<T extends any[]>(
  callback: (...args: T) => void,
  deps: React.DependencyList,
  delay = 100
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const stableCallback = useCallback((...args: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, deps);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return stableCallback;
}

/**
 * Prevent state updates when component is unmounted
 */
export function useIsMounted() {
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  return isMountedRef;
}

/**
 * Safe state setter that checks if component is still mounted
 */
export function useSafeState<T>(initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = React.useState(initialValue);
  const isMountedRef = useIsMounted();
  
  const safeSetState = useCallback((value: T | ((prev: T) => T)) => {
    if (isMountedRef.current) {
      setState(value);
    }
  }, [isMountedRef]);
  
  return [state, safeSetState];
}

/**
 * Stabilize object/array dependencies to prevent unnecessary re-renders
 */
export function useStableDeps<T>(deps: T): T {
  const ref = useRef<T>(deps);
  
  // Deep comparison for objects/arrays
  if (JSON.stringify(ref.current) !== JSON.stringify(deps)) {
    ref.current = deps;
  }
  
  return ref.current;
}

/**
 * Prevent excessive API calls or state updates
 */
export function useThrottle<T extends any[]>(
  callback: (...args: T) => void,
  delay: number
): (...args: T) => void {
  const lastRun = useRef(Date.now());
  
  return useCallback((...args: T) => {
    const now = Date.now();
    if (now - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = now;
    }
  }, [callback, delay]);
}