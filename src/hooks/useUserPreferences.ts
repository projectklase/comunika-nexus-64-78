import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserPreferencesService, UserComposerPreferences, UserTemplate } from '@/services/user-preferences';
import { PostType } from '@/types/post';

export function useUserPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserComposerPreferences | null>(null);
  
  const schoolSlug = user?.defaultSchoolSlug || 'default';
  const role = user?.role || 'unknown';

  useEffect(() => {
    if (user) {
      const prefs = UserPreferencesService.getComposerPreferences(schoolSlug, role);
      setPreferences(prefs);
    }
  }, [user, schoolSlug, role]);

  const updatePreferences = (updates: Partial<UserComposerPreferences>) => {
    if (!user || !preferences) return;

    const newPrefs = { ...preferences, ...updates };
    UserPreferencesService.saveComposerPreferences(schoolSlug, role, newPrefs);
    setPreferences(newPrefs);
  };

  const saveLastChoices = (
    type: PostType,
    classId: string,
    filterSettings?: {
      savedFilter: boolean;
      level: string;
      modality: string;
    }
  ) => {
    if (!preferences) return;

    updatePreferences({
      lastPostType: type,
      lastClassId: classId,
      lastFilterSettings: filterSettings || preferences.lastFilterSettings
    });
  };

  return {
    preferences,
    updatePreferences,
    saveLastChoices,
    isLoaded: preferences !== null
  };
}

export function useUserTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  
  const schoolSlug = user?.defaultSchoolSlug || 'default';
  const role = user?.role || 'unknown';

  const loadTemplates = () => {
    if (user) {
      const userTemplates = UserPreferencesService.getTemplates(schoolSlug, role);
      setTemplates(userTemplates);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [user, schoolSlug, role]);

  const saveTemplate = (template: Omit<UserTemplate, 'id' | 'createdAt' | 'usageCount'>) => {
    if (!user) return null;

    const newTemplate = UserPreferencesService.saveTemplate(schoolSlug, role, template);
    loadTemplates();
    return newTemplate;
  };

  const updateTemplate = (templateId: string, updates: Partial<UserTemplate>) => {
    if (!user) return false;

    const success = UserPreferencesService.updateTemplate(schoolSlug, role, templateId, updates);
    if (success) {
      loadTemplates();
    }
    return success;
  };

  const deleteTemplate = (templateId: string) => {
    if (!user) return false;

    const success = UserPreferencesService.deleteTemplate(schoolSlug, role, templateId);
    if (success) {
      loadTemplates();
    }
    return success;
  };

  const useTemplate = (templateId: string) => {
    if (!user) return null;

    UserPreferencesService.incrementTemplateUsage(schoolSlug, role, templateId);
    const template = templates.find(t => t.id === templateId);
    
    if (template) {
      // Update local state to reflect usage increment
      setTemplates(prev => prev.map(t => 
        t.id === templateId ? { ...t, usageCount: t.usageCount + 1 } : t
      ));
    }

    return template;
  };

  return {
    templates,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    useTemplate,
    reloadTemplates: loadTemplates
  };
}