import { useState, useEffect } from 'react';
import { PostFilter, PostType } from '@/types/post';
import { DEFAULT_SELECT_TOKENS, safeRestoreSelectValue } from './useSelectState';

export type QuickFilter = 'all' | 'secretaria' | 'professor' | 'pending' | 'saved' | 'important';

export interface AlunoFeedPreferences {
  hideRead: boolean;
  hideExpired?: boolean;
  sortBy: 'relevant' | 'recent' | 'urgency';
  pageSize: number;
}

export interface AlunoFeedFilters extends PostFilter {
  classId?: string;
  saved?: boolean;
  important?: boolean;
  quickFilter?: QuickFilter;
  authorRole?: 'secretaria' | 'professor' | 'aluno';
}

const PREFERENCES_KEY = 'aluno_feed_preferences';
const FILTERS_KEY = 'aluno_feed_filters';

const defaultPreferences: AlunoFeedPreferences = {
  hideRead: false,
  hideExpired: true,
  sortBy: 'recent', // FASE 1: Prioriza posts recentes ao invés de urgência
  pageSize: 10
};

const defaultFilters: AlunoFeedFilters = {
  quickFilter: 'all',
  classId: DEFAULT_SELECT_TOKENS.ALL_CLASSES
};

export function useAlunoFeedPreferences() {
  const [preferences, setPreferences] = useState<AlunoFeedPreferences>(defaultPreferences);
  const [filters, setFilters] = useState<AlunoFeedFilters>(defaultFilters);

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
        // Ensure classId is never empty
        const safeClassId = safeRestoreSelectValue(parsed.classId, DEFAULT_SELECT_TOKENS.ALL_CLASSES);
        setFilters({ 
          ...defaultFilters, 
          ...parsed, 
          classId: safeClassId 
        });
      }
    } catch (error) {
      console.warn('Error loading aluno feed preferences:', error);
    }
  }, []);

  // Save preferences to localStorage
  const updatePreferences = (newPreferences: Partial<AlunoFeedPreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
  };

  // Save filters to localStorage
  const updateFilters = (newFilters: Partial<AlunoFeedFilters>) => {
    // Ensure classId is never empty
    const safeClassId = newFilters.classId === '' 
      ? DEFAULT_SELECT_TOKENS.ALL_CLASSES 
      : newFilters.classId || filters.classId;

    const updated = { ...filters, ...newFilters, classId: safeClassId };
    setFilters(updated);
    localStorage.setItem(FILTERS_KEY, JSON.stringify(updated));
  };

  // Apply quick filter
  const applyQuickFilter = (quickFilter: QuickFilter) => {
    let filterUpdate: Partial<AlunoFeedFilters> = { quickFilter };

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
      case 'pending':
        filterUpdate = {
          ...filterUpdate,
          type: 'ATIVIDADE' as PostType,
          status: 'PUBLISHED',
          saved: undefined,
          authorRole: undefined
          // TODO: Add logic for pending activities
        };
        break;
      case 'saved':
        filterUpdate = {
          ...filterUpdate,
          saved: true,
          important: undefined,
          type: undefined,
          status: undefined,
          authorRole: undefined
        };
        break;
      case 'important':
        filterUpdate = {
          ...filterUpdate,
          important: true,
          saved: undefined,
          type: undefined,
          status: 'PUBLISHED',
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