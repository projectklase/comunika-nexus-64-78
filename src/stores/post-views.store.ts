import { create } from 'zustand';
import { User } from '@/types/auth';

export type PostViewSource = 'feed' | 'calendar' | 'notification' | 'deep-link' | 'dashboard';

export interface PostView {
  postId: string;
  userId: string;
  name: string;
  role: 'secretaria' | 'professor' | 'aluno';
  classId?: string | null;
  source: PostViewSource;
  viewedAt: string; // ISO string
}

interface PostViewsState {
  views: PostView[];
  subscribe: (listener: () => void) => () => void;
}

interface PostViewsActions {
  recordPostView: (postId: string, user: User, source: PostViewSource, classId?: string) => void;
  getViews: (postId: string) => PostView[];
  getUniqueCount: (postId: string) => number;
  getTotalCount: (postId: string) => number;
  clearViews: (postId: string) => void;
  exportViews: (postId: string) => void;
}

type PostViewsStore = PostViewsState & PostViewsActions;

const STORAGE_KEY = 'comunika:postViews:v1';
const DEBOUNCE_HOURS = 6;

// Load views from localStorage
const loadViewsFromStorage = (): PostView[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load post views from storage:', error);
    return [];
  }
};

// Save views to localStorage
const saveViewsToStorage = (views: PostView[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch (error) {
    console.warn('Failed to save post views to storage:', error);
  }
};

// Check if view should be recorded (debounce logic)
const shouldRecordView = (existingViews: PostView[], postId: string, userId: string): boolean => {
  const existingView = existingViews.find(v => v.postId === postId && v.userId === userId);
  
  if (!existingView) {
    return true; // No existing view, record it
  }
  
  // Check if existing view is older than debounce period
  const now = new Date();
  const lastView = new Date(existingView.viewedAt);
  const hoursDiff = (now.getTime() - lastView.getTime()) / (1000 * 60 * 60);
  
  return hoursDiff >= DEBOUNCE_HOURS;
};

// Humanize source for export
const humanizeSource = (source: PostViewSource): string => {
  const sourceMap = {
    feed: 'Feed',
    calendar: 'Calendário',
    notification: 'Notificação',
    'deep-link': 'Link Direto',
    dashboard: 'Dashboard'
  };
  return sourceMap[source] || source;
};

export const usePostViews = create<PostViewsStore>((set, get) => {
  const initialViews = loadViewsFromStorage();
  const listeners = new Set<() => void>();

  return {
    views: initialViews,

    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    recordPostView: (postId: string, user: User, source: PostViewSource, classId?: string) => {
      const currentViews = get().views;
      
      // Check debounce
      if (!shouldRecordView(currentViews, postId, user.id)) {
        return; // Skip recording due to debounce
      }

      const now = new Date().toISOString();
      
      // Remove existing view for this user/post if it exists
      const filteredViews = currentViews.filter(v => !(v.postId === postId && v.userId === user.id));
      
      // Create new view
      const newView: PostView = {
        postId,
        userId: user.id,
        name: user.name,
        role: user.role,
        classId: classId || null,
        source,
        viewedAt: now
      };

      const updatedViews = [...filteredViews, newView];
      
      set({ views: updatedViews });
      saveViewsToStorage(updatedViews);
      
      // Notify subscribers
      listeners.forEach(listener => listener());
    },

    getViews: (postId: string) => {
      return get().views
        .filter(v => v.postId === postId)
        .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime());
    },

    getUniqueCount: (postId: string) => {
      const views = get().views.filter(v => v.postId === postId);
      const uniqueUsers = new Set(views.map(v => v.userId));
      return uniqueUsers.size;
    },

    getTotalCount: (postId: string) => {
      return get().views.filter(v => v.postId === postId).length;
    },

    clearViews: (postId: string) => {
      const currentViews = get().views;
      const filteredViews = currentViews.filter(v => v.postId !== postId);
      
      set({ views: filteredViews });
      saveViewsToStorage(filteredViews);
      
      // Notify subscribers
      listeners.forEach(listener => listener());
    },

    exportViews: (postId: string) => {
      const views = get().getViews(postId);
      
      if (views.length === 0) {
        return;
      }

      // Prepare CSV data
      const headers = ['Nome', 'Função', 'Turma', 'Fonte', 'Visualizado em'];
      const rows = views.map(view => [
        view.name,
        view.role.toUpperCase(),
        view.classId || 'N/A',
        humanizeSource(view.source),
        new Date(view.viewedAt).toLocaleString('pt-BR')
      ]);

      // Create CSV content
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `visualizacoes-post-${postId}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };
});