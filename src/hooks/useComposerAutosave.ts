import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AutosaveService, DraftData } from '@/services/autosave-service';
import { createDebouncedUpdater } from '@/utils/performance-utils';
import { PostType } from '@/types/post';

interface AutosaveOptions {
  tempId: string;
  onDraftLoaded?: (draft: DraftData) => void;
  onDraftSaved?: () => void;
  onDraftDeleted?: () => void;
  debounceMs?: number;
}

interface ComposerData {
  type: PostType;
  title: string;
  body: string;
  audience: 'GLOBAL' | 'CLASS';
  selectedClassIds: string[];
  eventStartDate: string;
  eventStartTime: string;
  eventEndDate: string;
  eventEndTime: string;
  eventLocation: string;
  dueDate: string;
  dueTime: string;
  isFromDayFocus?: boolean;
  dayFocusDate?: string;
}

export function useComposerAutosave(options: AutosaveOptions) {
  const { user } = useAuth();
  const lastSavedData = useRef<ComposerData | null>(null);
  const isInitialized = useRef(false);
  
  const schoolSlug = user?.defaultSchoolSlug || 'default';
  const role = user?.role || 'unknown';

  // Create debounced save function
  const debouncedSave = useRef(
    createDebouncedUpdater(async (data: ComposerData) => {
      if (!user) return;

      // Only save if there's meaningful content
      const hasContent = data.title.trim() || data.body.trim() || data.eventLocation.trim();
      if (!hasContent) return;

      // Check if data has actually changed
      if (lastSavedData.current && 
          JSON.stringify(lastSavedData.current) === JSON.stringify(data)) {
        return;
      }

      AutosaveService.saveDraft(schoolSlug, role, options.tempId, {
        ...data,
        savedAt: new Date().toISOString()
      });

      lastSavedData.current = { ...data };
      options.onDraftSaved?.();
    }, options.debounceMs || 1000)
  );

  // Load draft on mount
  useEffect(() => {
    if (!user || isInitialized.current) return;

    const draft = AutosaveService.loadDraft(role, schoolSlug, options.tempId);
    if (draft) {
      options.onDraftLoaded?.(draft);
      lastSavedData.current = draft;
    }

    // Cleanup old drafts
    AutosaveService.cleanupOldDrafts(schoolSlug, role);
    isInitialized.current = true;
  }, [user, role, schoolSlug, options.tempId]);

  const saveDraft = useCallback((data: ComposerData) => {
    debouncedSave.current(data);
  }, []);

  const deleteDraft = useCallback(() => {
    if (!user) return;
    
    AutosaveService.deleteDraft(role, schoolSlug, options.tempId);
    lastSavedData.current = null;
    options.onDraftDeleted?.();
  }, [user, role, schoolSlug, options.tempId]);

  const hasUnsavedChanges = useCallback((currentData: ComposerData): boolean => {
    if (!user) return false;
    
    return AutosaveService.hasUnsavedChanges(role, schoolSlug, options.tempId, currentData);
  }, [user, role, schoolSlug, options.tempId]);

  const getAllDrafts = useCallback(() => {
    if (!user) return [];
    
    return AutosaveService.getAllDrafts(schoolSlug, role);
  }, [user, schoolSlug, role]);

  return {
    saveDraft,
    deleteDraft,
    hasUnsavedChanges,
    getAllDrafts
  };
}