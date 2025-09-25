class ReadStore {
  private reads: Set<string> = new Set();
  private storageKey = 'comunika_reads';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.reads = new Set(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading reads from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify([...this.reads]));
    } catch (error) {
      console.error('Error saving reads to storage:', error);
    }
  }

  markAsRead(postId: string) {
    this.reads.add(postId);
    this.saveToStorage();
  }

  isRead(postId: string): boolean {
    return this.reads.has(postId);
  }

  unmarkAsRead(postId: string) {
    this.reads.delete(postId);
    this.saveToStorage();
  }

  getReadCount(): number {
    return this.reads.size;
  }

  clear() {
    this.reads.clear();
    this.saveToStorage();
  }
}

export const readStore = new ReadStore();