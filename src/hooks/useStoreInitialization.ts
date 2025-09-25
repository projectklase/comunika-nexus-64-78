import { useEffect } from 'react';
import { useClassStore } from '@/stores/class-store';
import { usePeopleStore } from '@/stores/people-store';

export function useStoreInitialization() {
  const loadClasses = useClassStore(state => state.loadClasses);
  const loadPeople = usePeopleStore(state => state.loadPeople);
  
  useEffect(() => {
    // Initialize stores only once on mount
    loadClasses();
    loadPeople();
  }, []); // Empty dependency array - runs only once
}