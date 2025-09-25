import { PostInput, PostType } from '@/types/post';

export interface DraftData {
  id: string;
  schoolSlug: string;
  role: string;
  tempId: string;
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
  savedAt: string;
  isFromDayFocus: boolean;
  dayFocusDate?: string;
}

export class AutosaveService {
  private static readonly STORAGE_KEY = 'composer_drafts';
  private static readonly MAX_DRAFTS = 10;

  private static getDraftKey(role: string, schoolSlug: string, tempId: string): string {
    return `draft:post:${role}:${schoolSlug}:${tempId}`;
  }

  static saveDraft(
    schoolSlug: string,
    role: string,
    tempId: string,
    data: Partial<DraftData>
  ): void {
    try {
      const draft: DraftData = {
        id: this.getDraftKey(role, schoolSlug, tempId),
        schoolSlug,
        role,
        tempId,
        type: 'AVISO',
        title: '',
        body: '',
        audience: 'GLOBAL',
        selectedClassIds: [],
        eventStartDate: '',
        eventStartTime: '',
        eventEndDate: '',
        eventEndTime: '',
        eventLocation: '',
        dueDate: '',
        dueTime: '',
        savedAt: new Date().toISOString(),
        isFromDayFocus: false,
        ...data
      };

      // Save individual draft
      localStorage.setItem(draft.id, JSON.stringify(draft));

      // Update drafts index
      this.updateDraftsIndex(draft);
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }

  static loadDraft(role: string, schoolSlug: string, tempId: string): DraftData | null {
    try {
      const key = this.getDraftKey(role, schoolSlug, tempId);
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
    return null;
  }

  static deleteDraft(role: string, schoolSlug: string, tempId: string): void {
    try {
      const key = this.getDraftKey(role, schoolSlug, tempId);
      localStorage.removeItem(key);
      
      // Update drafts index
      this.removeDraftFromIndex(key);
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  }

  static getAllDrafts(schoolSlug: string, role: string): DraftData[] {
    try {
      const indexKey = `${this.STORAGE_KEY}_${schoolSlug}_${role}`;
      const indexStored = localStorage.getItem(indexKey);
      
      if (!indexStored) return [];
      
      const draftKeys: string[] = JSON.parse(indexStored);
      const drafts: DraftData[] = [];
      
      for (const key of draftKeys) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const draft = JSON.parse(stored);
            drafts.push(draft);
          } catch {
            // Remove corrupted draft
            localStorage.removeItem(key);
          }
        }
      }
      
      // Sort by save time, most recent first
      return drafts.sort((a, b) => 
        new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      );
    } catch (error) {
      console.error('Error loading all drafts:', error);
      return [];
    }
  }

  static hasUnsavedChanges(
    role: string,
    schoolSlug: string,
    tempId: string,
    currentData: Partial<DraftData>
  ): boolean {
    const draft = this.loadDraft(role, schoolSlug, tempId);
    if (!draft) return false;

    // Check if there are meaningful changes
    const hasChanges = (
      draft.title.trim() !== (currentData.title || '').trim() ||
      draft.body.trim() !== (currentData.body || '').trim() ||
      draft.type !== currentData.type ||
      JSON.stringify(draft.selectedClassIds) !== JSON.stringify(currentData.selectedClassIds) ||
      draft.eventLocation.trim() !== (currentData.eventLocation || '').trim() ||
      draft.eventStartDate !== (currentData.eventStartDate || '') ||
      draft.eventStartTime !== (currentData.eventStartTime || '') ||
      draft.dueDate !== (currentData.dueDate || '') ||
      draft.dueTime !== (currentData.dueTime || '')
    );

    return hasChanges && (
      draft.title.trim() !== '' || 
      draft.body.trim() !== '' ||
      draft.eventLocation.trim() !== ''
    );
  }

  static cleanupOldDrafts(schoolSlug: string, role: string): void {
    const drafts = this.getAllDrafts(schoolSlug, role);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Remove drafts older than 7 days
    const toRemove = drafts.filter(draft => 
      new Date(draft.savedAt) < sevenDaysAgo
    );

    toRemove.forEach(draft => {
      localStorage.removeItem(draft.id);
    });

    // Keep only the most recent drafts if there are too many
    if (drafts.length > this.MAX_DRAFTS) {
      const sortedDrafts = drafts.sort((a, b) => 
        new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      );
      
      const toRemoveOld = sortedDrafts.slice(this.MAX_DRAFTS);
      toRemoveOld.forEach(draft => {
        localStorage.removeItem(draft.id);
      });
    }

    // Update index
    this.rebuildDraftsIndex(schoolSlug, role);
  }

  private static updateDraftsIndex(draft: DraftData): void {
    try {
      const indexKey = `${this.STORAGE_KEY}_${draft.schoolSlug}_${draft.role}`;
      const indexStored = localStorage.getItem(indexKey);
      
      let draftKeys: string[] = indexStored ? JSON.parse(indexStored) : [];
      
      // Add new draft key if not exists
      if (!draftKeys.includes(draft.id)) {
        draftKeys.unshift(draft.id);
      }
      
      // Keep only the most recent drafts
      draftKeys = draftKeys.slice(0, this.MAX_DRAFTS);
      
      localStorage.setItem(indexKey, JSON.stringify(draftKeys));
    } catch (error) {
      console.error('Error updating drafts index:', error);
    }
  }

  private static removeDraftFromIndex(draftKey: string): void {
    try {
      // Extract schoolSlug and role from the key
      const parts = draftKey.split(':');
      if (parts.length >= 4) {
        const role = parts[2];
        const schoolSlug = parts[3];
        const indexKey = `${this.STORAGE_KEY}_${schoolSlug}_${role}`;
        
        const indexStored = localStorage.getItem(indexKey);
        if (indexStored) {
          let draftKeys: string[] = JSON.parse(indexStored);
          draftKeys = draftKeys.filter(key => key !== draftKey);
          localStorage.setItem(indexKey, JSON.stringify(draftKeys));
        }
      }
    } catch (error) {
      console.error('Error removing draft from index:', error);
    }
  }

  private static rebuildDraftsIndex(schoolSlug: string, role: string): void {
    try {
      const indexKey = `${this.STORAGE_KEY}_${schoolSlug}_${role}`;
      const prefix = this.getDraftKey(role, schoolSlug, '');
      const draftKeys: string[] = [];
      
      // Scan localStorage for matching draft keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          draftKeys.push(key);
        }
      }
      
      localStorage.setItem(indexKey, JSON.stringify(draftKeys));
    } catch (error) {
      console.error('Error rebuilding drafts index:', error);
    }
  }
}
