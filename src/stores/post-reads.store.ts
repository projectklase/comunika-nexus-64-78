import { create } from 'zustand';
import { User } from '@/types/auth';

export interface PostRead {
  postId: string;
  userId: string;
  name: string;
  role: 'secretaria' | 'professor' | 'aluno';
  classId?: string | null;
  readAt: string; // ISO string
}

interface PostReadsState {
  reads: PostRead[];
  subscribe: (listener: () => void) => () => void;
}

interface PostReadsActions {
  recordPostRead: (postId: string, user: User, classId?: string) => void;
  getReads: (postId: string) => PostRead[];
  getUniqueCount: (postId: string) => number;
  getTotalCount: (postId: string) => number;
  clearReads: (postId: string) => void;
  exportReads: (postId: string) => void;
  isRead: (postId: string, userId: string) => boolean;
}

type PostReadsStore = PostReadsState & PostReadsActions;

const STORAGE_KEY = 'comunika:postReads:v1';
const DEBOUNCE_HOURS = 24; // Only record one read per day per user per post

// Load reads from localStorage
const loadReadsFromStorage = (): PostRead[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load post reads from storage:', error);
    return [];
  }
};

// Save reads to localStorage
const saveReadsToStorage = (reads: PostRead[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reads));
  } catch (error) {
    console.warn('Failed to save post reads to storage:', error);
  }
};

// Check if read should be recorded (debounce logic)
const shouldRecordRead = (existingReads: PostRead[], postId: string, userId: string): boolean => {
  const existingRead = existingReads.find(r => r.postId === postId && r.userId === userId);
  
  if (!existingRead) {
    return true; // No existing read, record it
  }
  
  // Check if existing read is older than debounce period
  const now = new Date();
  const lastRead = new Date(existingRead.readAt);
  const hoursDiff = (now.getTime() - lastRead.getTime()) / (1000 * 60 * 60);
  
  return hoursDiff >= DEBOUNCE_HOURS;
};

export const usePostReads = create<PostReadsStore>((set, get) => {
  const initialReads = loadReadsFromStorage();
  const listeners = new Set<() => void>();

  return {
    reads: initialReads,

    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    recordPostRead: (postId: string, user: User, classId?: string) => {
      const currentReads = get().reads;
      
      // Check debounce
      if (!shouldRecordRead(currentReads, postId, user.id)) {
        return; // Skip recording due to debounce
      }

      const now = new Date().toISOString();
      
      // Remove existing read for this user/post if it exists
      const filteredReads = currentReads.filter(r => !(r.postId === postId && r.userId === user.id));
      
      // Create new read
      const newRead: PostRead = {
        postId,
        userId: user.id,
        name: user.name,
        role: user.role,
        classId: classId || null,
        readAt: now
      };

      const updatedReads = [...filteredReads, newRead];
      
      set({ reads: updatedReads });
      saveReadsToStorage(updatedReads);
      
      // Notify subscribers
      listeners.forEach(listener => listener());
    },

    getReads: (postId: string) => {
      return get().reads
        .filter(r => r.postId === postId)
        .sort((a, b) => new Date(b.readAt).getTime() - new Date(a.readAt).getTime());
    },

    getUniqueCount: (postId: string) => {
      const reads = get().reads.filter(r => r.postId === postId);
      const uniqueUsers = new Set(reads.map(r => r.userId));
      return uniqueUsers.size;
    },

    getTotalCount: (postId: string) => {
      return get().reads.filter(r => r.postId === postId).length;
    },

    isRead: (postId: string, userId: string) => {
      return get().reads.some(r => r.postId === postId && r.userId === userId);
    },

    clearReads: (postId: string) => {
      const currentReads = get().reads;
      const filteredReads = currentReads.filter(r => r.postId !== postId);
      
      set({ reads: filteredReads });
      saveReadsToStorage(filteredReads);
      
      // Notify subscribers
      listeners.forEach(listener => listener());
    },

    exportReads: (postId: string) => {
      const reads = get().getReads(postId);
      
      if (reads.length === 0) {
        return;
      }

      // Prepare CSV data
      const headers = ['Nome', 'Função', 'Turma', 'Marcado como lido em'];
      const rows = reads.map(read => [
        read.name,
        read.role.toUpperCase(),
        read.classId || 'N/A',
        new Date(read.readAt).toLocaleString('pt-BR')
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
      link.setAttribute('download', `leituras-post-${postId}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };
});