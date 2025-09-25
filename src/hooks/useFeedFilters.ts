import { useState, useEffect } from 'react';
import { PostFilter, PostType } from '@/types/post';
import { DEFAULT_SELECT_TOKENS, safeRestoreSelectValue } from './useSelectState';
import { useAuth } from '@/contexts/AuthContext';

export type QuickFilter = 'all' | 'secretaria' | 'professor' | 'pending' | 'saved' | 'scheduled';

export interface FeedFilters extends PostFilter {
  classId?: string;
  saved?: boolean;
  quickFilter?: QuickFilter;
  authorRole?: 'secretaria' | 'professor' | 'aluno';
}

export interface FeedPreferences {
  hideRead: boolean;
  hideExpired?: boolean;
  sortBy: 'relevant' | 'recent';
  pageSize: number;
}

const defaultPreferences: FeedPreferences = {
  hideRead: false,
  hideExpired: true,
  sortBy: 'relevant',
  pageSize: 10
};

const defaultFilters: FeedFilters = {
  quickFilter: 'all',
  classId: DEFAULT_SELECT_TOKENS.ALL_CLASSES
};

export function useFeedFilters() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<FeedPreferences>(defaultPreferences);
  const [filters, setFilters] = useState<FeedFilters>(defaultFilters);
  
  const PREFERENCES_KEY = `feed_preferences_${user?.role || 'guest'}`;
  const FILTERS_KEY = `feed_filters_${user?.role || 'guest'}`;

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const storedPrefs = localStorage.getItem(PREFERENCES_KEY);
      if (storedPrefs) {
        const parsed = JSON.parse(storedPrefs);
        setPreferences({ ...defaultPreferences, ...parsed });
      }

      const storedFilters = localStorage.getItem(FILTERS_KEY);
      if (storedFilters) {
        const parsed = JSON.parse(storedFilters);
        const safeClassId = safeRestoreSelectValue(parsed.classId, DEFAULT_SELECT_TOKENS.ALL_CLASSES);
        setFilters({ 
          ...defaultFilters, 
          ...parsed, 
          classId: safeClassId 
        });
      }
    } catch (error) {
      console.warn('Error loading feed preferences:', error);
    }
  }, [PREFERENCES_KEY, FILTERS_KEY]);

  // Save preferences to localStorage
  const updatePreferences = (newPreferences: Partial<FeedPreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
  };

  // Save filters to localStorage
  const updateFilters = (newFilters: Partial<FeedFilters>) => {
    const safeClassId = newFilters.classId === '' 
      ? DEFAULT_SELECT_TOKENS.ALL_CLASSES 
      : newFilters.classId || filters.classId;

    const updated = { ...filters, ...newFilters, classId: safeClassId };
    setFilters(updated);
    localStorage.setItem(FILTERS_KEY, JSON.stringify(updated));
  };

  // Apply quick filter based on user role
  const applyQuickFilter = (quickFilter: QuickFilter) => {
    let filterUpdate: Partial<FeedFilters> = { quickFilter };

    switch (quickFilter) {
      case 'all':
        filterUpdate = {
          ...filterUpdate,
          type: undefined,
          status: undefined,
          saved: undefined,
          authorRole: undefined
        };
        break;
      case 'secretaria':
        filterUpdate = {
          ...filterUpdate,
          type: undefined,
          status: 'PUBLISHED',
          saved: undefined,
          authorRole: 'secretaria'
        };
        break;
      case 'professor':
        filterUpdate = {
          ...filterUpdate,
          type: undefined, // Show all types from professors
          status: 'PUBLISHED',
          saved: undefined,
          authorRole: 'professor'
        };
        break;
      case 'scheduled':
        filterUpdate = {
          ...filterUpdate,
          type: undefined,
          status: 'SCHEDULED',
          saved: undefined,
          authorRole: undefined
        };
        break;
      case 'pending':
        filterUpdate = {
          ...filterUpdate,
          type: 'ATIVIDADE' as PostType,
          status: 'PUBLISHED',
          saved: undefined,
          authorRole: undefined
        };
        break;
      case 'saved':
        filterUpdate = {
          ...filterUpdate,
          saved: true,
          type: undefined,
          status: undefined,
          authorRole: undefined
        };
        break;
    }

    updateFilters(filterUpdate);
  };

  // Reset all filters and preferences
  const resetAll = () => {
    setPreferences(defaultPreferences);
    setFilters(defaultFilters);
    localStorage.removeItem(PREFERENCES_KEY);
    localStorage.removeItem(FILTERS_KEY);
  };

  // Check if filters are active (not default)
  const hasActiveFilters = () => {
    return (
      filters.quickFilter !== 'all' ||
      filters.query ||
      (filters.classId && filters.classId !== DEFAULT_SELECT_TOKENS.ALL_CLASSES) ||
      filters.type ||
      filters.status ||
      filters.saved ||
      filters.authorRole
    );
  };

  return {
    preferences,
    filters,
    updatePreferences,
    updateFilters,
    applyQuickFilter,
    resetAll,
    hasActiveFilters: hasActiveFilters()
  };
}