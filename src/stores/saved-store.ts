class SavedStore {
  private saved: Set<string> = new Set();
  private storageKey = 'comunika_saved';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.saved = new Set(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading saved posts from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify([...this.saved]));
    } catch (error) {
      console.error('Error saving saved posts to storage:', error);
    }
  }

  save(postId: string) {
    this.saved.add(postId);
    this.saveToStorage();
  }

  unsave(postId: string) {
    this.saved.delete(postId);
    this.saveToStorage();
  }

  isSaved(postId: string): boolean {
    return this.saved.has(postId);
  }

  getSavedCount(): number {
    return this.saved.size;
  }

  getSavedIds(): string[] {
    return [...this.saved];
  }

  clear() {
    this.saved.clear();
    this.saveToStorage();
  }
}

export const savedStore = new SavedStore();