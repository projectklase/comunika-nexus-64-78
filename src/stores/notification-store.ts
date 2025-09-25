export type NotificationType = 
  | 'RESET_REQUESTED' 
  | 'RESET_IN_PROGRESS' 
  | 'RESET_COMPLETED' 
  | 'RESET_CANCELLED'
  | 'POST_NEW'
  | 'POST_IMPORTANT' 
  | 'HOLIDAY'
  | 'KOINS_EARNED'
  | 'KOIN_BONUS'
  | 'REDEMPTION_REQUESTED'
  | 'REDEMPTION_APPROVED'
  | 'REDEMPTION_REJECTED';

export type NotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED';

export type RoleTarget = 'SECRETARIA' | 'PROFESSOR' | 'ALUNO';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  roleTarget: RoleTarget;
  status: NotificationStatus;
  createdAt: string;
  link?: string;
  meta?: Record<string, any>;
}

class NotificationStore {
  private notifications: Notification[] = [];
  private storageKey = 'komunika.notifications.v1';
  private broadcastKey = '__notify_broadcast__';
  private subscribers: Set<() => void> = new Set();
  private broadcastChannel?: BroadcastChannel;

  constructor() {
    this.loadFromStorage();
    this.startCleanupRoutine();
    this.initializeBroadcast();
  }

  private initializeBroadcast() {
    // Modern browsers: Use BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel('notifications');
      this.broadcastChannel.onmessage = () => {
        this.loadFromStorage();
        this.notifySubscribers();
      };
    }

    // Fallback: Use localStorage events
    window.addEventListener('storage', (e) => {
      if (e.key === this.broadcastKey || e.key === this.storageKey) {
        this.loadFromStorage();
        this.notifySubscribers();
      }
    });
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.notifications = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading notifications from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.notifications));
      
      // Broadcast to other tabs
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'notifications:update' });
      }
      
      // Fallback broadcast via localStorage
      localStorage.setItem(this.broadcastKey, Date.now().toString());
      
      // Emit custom event for same-tab subscribers
      window.dispatchEvent(new CustomEvent('notifications:invalidate'));
      
      this.notifySubscribers();
    } catch (error) {
      console.error('Error saving notifications to storage:', error);
    }
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in notification store subscriber:', error);
      }
    });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private startCleanupRoutine() {
    // Clean up old archived notifications (30+ days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    this.notifications = this.notifications.filter(notification => {
      if (notification.status === 'ARCHIVED') {
        const createdTime = new Date(notification.createdAt).getTime();
        return createdTime > thirtyDaysAgo;
      }
      return true;
    });
    
    this.saveToStorage();
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  add(notification: Omit<Notification, 'id' | 'createdAt' | 'status'>): Notification {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      status: 'UNREAD'
    };

    this.notifications.unshift(newNotification);
    this.saveToStorage();

    return newNotification;
  }

  list(filters?: {
    status?: NotificationStatus;
    search?: string;
    limit?: number;
    roleTarget?: RoleTarget;
    type?: NotificationType;
  }): Notification[] {
    let filtered = [...this.notifications];

    if (filters?.roleTarget) {
      filtered = filtered.filter(n => n.roleTarget === filters.roleTarget);
    }

    if (filters?.status) {
      filtered = filtered.filter(n => n.status === filters.status);
    }

    if (filters?.type) {
      filtered = filtered.filter(n => n.type === filters.type);
    }

    if (filters?.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        (n.meta?.email && n.meta.email.toLowerCase().includes(query))
      );
    }

    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getById(id: string): Notification | undefined {
    return this.notifications.find(n => n.id === id);
  }

  markRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification && notification.status === 'UNREAD') {
      notification.status = 'READ';
      this.saveToStorage();
    }
  }

  markAllRead(roleTarget: RoleTarget): void {
    let changed = false;
    this.notifications.forEach(notification => {
      if (notification.roleTarget === roleTarget && notification.status === 'UNREAD') {
        notification.status = 'READ';
        changed = true;
      }
    });
    
    if (changed) {
      this.saveToStorage();
    }
  }

  archive(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.status = 'ARCHIVED';
      this.saveToStorage();
    }
  }

  clear(status?: NotificationStatus): void {
    if (status) {
      this.notifications = this.notifications.filter(n => n.status !== status);
    } else {
      this.notifications = [];
    }
    this.saveToStorage();
  }

  deleteRead(roleTarget: RoleTarget): void {
    this.notifications = this.notifications.filter(
      n => !(n.roleTarget === roleTarget && n.status === 'READ')
    );
    this.saveToStorage();
  }

  delete(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.saveToStorage();
  }

  getStats(roleTarget: RoleTarget) {
    const roleNotifications = this.notifications.filter(n => n.roleTarget === roleTarget);
    const unread = roleNotifications.filter(n => n.status === 'UNREAD').length;
    const read = roleNotifications.filter(n => n.status === 'READ').length;
    const archived = roleNotifications.filter(n => n.status === 'ARCHIVED').length;
    
    return { 
      total: roleNotifications.length, 
      unread, 
      read, 
      archived 
    };
  }
}

export const notificationStore = new NotificationStore();