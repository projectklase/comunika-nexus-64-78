import { PostType } from '@/types/post';

export interface UserComposerPreferences {
  lastPostType: PostType;
  lastClassId: string;
  defaultEventDuration: number; // minutes
  lastFilterSettings: {
    savedFilter: boolean;
    level: string;
    modality: string;
  };
}

export interface UserTemplate {
  id: string;
  name: string;
  type: PostType;
  title: string;
  body: string;
  eventLocation?: string;
  eventDuration?: number;
  createdAt: string;
  usageCount: number;
}

export class UserPreferencesService {
  private static getStorageKey(schoolSlug: string, role: string, type: 'prefs' | 'templates'): string {
    return `userPrefs_${type}_${schoolSlug}_${role}`;
  }

  // Composer Preferences
  static getComposerPreferences(schoolSlug: string, role: string): UserComposerPreferences {
    try {
      const key = this.getStorageKey(schoolSlug, role, 'prefs');
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }

    // Default preferences based on role
    const defaultType: PostType = role === 'professor' ? 'ATIVIDADE' : 'AVISO';
    
    return {
      lastPostType: defaultType,
      lastClassId: 'ALL_CLASSES',
      defaultEventDuration: 60,
      lastFilterSettings: {
        savedFilter: false,
        level: 'ALL_LEVELS',
        modality: 'ALL_MODALITIES'
      }
    };
  }

  static saveComposerPreferences(
    schoolSlug: string, 
    role: string, 
    prefs: UserComposerPreferences
  ): void {
    try {
      const key = this.getStorageKey(schoolSlug, role, 'prefs');
      localStorage.setItem(key, JSON.stringify(prefs));
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  }

  // Templates Management
  static getTemplates(schoolSlug: string, role: string): UserTemplate[] {
    try {
      const key = this.getStorageKey(schoolSlug, role, 'templates');
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
    return [];
  }

  static saveTemplate(
    schoolSlug: string,
    role: string,
    template: Omit<UserTemplate, 'id' | 'createdAt' | 'usageCount'>
  ): UserTemplate {
    const templates = this.getTemplates(schoolSlug, role);
    
    const newTemplate: UserTemplate = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    const updatedTemplates = [newTemplate, ...templates.slice(0, 19)]; // Keep max 20 templates
    
    try {
      const key = this.getStorageKey(schoolSlug, role, 'templates');
      localStorage.setItem(key, JSON.stringify(updatedTemplates));
    } catch (error) {
      console.error('Error saving template:', error);
    }

    return newTemplate;
  }

  static updateTemplate(
    schoolSlug: string,
    role: string,
    templateId: string,
    updates: Partial<UserTemplate>
  ): boolean {
    const templates = this.getTemplates(schoolSlug, role);
    const index = templates.findIndex(t => t.id === templateId);
    
    if (index === -1) return false;

    templates[index] = { ...templates[index], ...updates };
    
    try {
      const key = this.getStorageKey(schoolSlug, role, 'templates');
      localStorage.setItem(key, JSON.stringify(templates));
      return true;
    } catch (error) {
      console.error('Error updating template:', error);
      return false;
    }
  }

  static deleteTemplate(schoolSlug: string, role: string, templateId: string): boolean {
    const templates = this.getTemplates(schoolSlug, role);
    const filtered = templates.filter(t => t.id !== templateId);
    
    try {
      const key = this.getStorageKey(schoolSlug, role, 'templates');
      localStorage.setItem(key, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      return false;
    }
  }

  static incrementTemplateUsage(schoolSlug: string, role: string, templateId: string): void {
    const templates = this.getTemplates(schoolSlug, role);
    const template = templates.find(t => t.id === templateId);
    
    if (template) {
      template.usageCount++;
      try {
        const key = this.getStorageKey(schoolSlug, role, 'templates');
        localStorage.setItem(key, JSON.stringify(templates));
      } catch (error) {
        console.error('Error incrementing template usage:', error);
      }
    }
  }
}