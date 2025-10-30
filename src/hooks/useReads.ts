import { useState, useEffect } from 'react';
import { readStore } from '@/stores/read-store';
import { usePostReads } from '@/stores/post-reads.store';
import { useAuth } from '@/contexts/AuthContext';
import { usePostRead } from '@/hooks/usePostRead';
import { toast } from 'sonner';

// ✅ SEGURANÇA ANTI-EXPLOIT: Rate limiting no frontend
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_READS_PER_WINDOW = 15; // Máximo 15 leituras por minuto
const MIN_TIME_BETWEEN_READS = 2000; // 2 segundos entre leituras

class ReadRateLimiter {
  private readTimestamps: number[] = [];
  private lastReadTime: number = 0;
  private storageKey = 'comunika_read_rate_limit';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.readTimestamps = JSON.parse(stored);
        // Limpar timestamps antigos ao carregar
        this.cleanOldTimestamps();
      }
    } catch (error) {
      console.error('Error loading rate limit data:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.readTimestamps));
    } catch (error) {
      console.error('Error saving rate limit data:', error);
    }
  }

  private cleanOldTimestamps() {
    const now = Date.now();
    this.readTimestamps = this.readTimestamps.filter(
      timestamp => now - timestamp < RATE_LIMIT_WINDOW
    );
  }

  canRead(): { allowed: boolean; reason?: string } {
    const now = Date.now();
    
    // Verificar tempo mínimo entre leituras (debounce)
    if (now - this.lastReadTime < MIN_TIME_BETWEEN_READS) {
      return {
        allowed: false,
        reason: 'Aguarde alguns segundos antes de ler outro post.'
      };
    }

    // Limpar timestamps antigos
    this.cleanOldTimestamps();

    // Verificar limite de leituras por janela de tempo
    if (this.readTimestamps.length >= MAX_READS_PER_WINDOW) {
      return {
        allowed: false,
        reason: `Você atingiu o limite de ${MAX_READS_PER_WINDOW} leituras por minuto. Aguarde um pouco e tente novamente.`
      };
    }

    return { allowed: true };
  }

  recordRead() {
    const now = Date.now();
    this.readTimestamps.push(now);
    this.lastReadTime = now;
    this.cleanOldTimestamps();
    this.saveToStorage();
  }

  reset() {
    this.readTimestamps = [];
    this.lastReadTime = 0;
    this.saveToStorage();
  }
}

const rateLimiter = new ReadRateLimiter();

export function useReads() {
  const [_, forceUpdate] = useState({});
  const { recordPostRead } = usePostReads();
  const { recordRead } = usePostRead();
  const { user } = useAuth();

  const markAsRead = (postId: string) => {
    // Check if already read FIRST (before rate limiting)
    if (readStore.isRead(postId)) {
      // Post already read, don't trigger rate limiter
      return;
    }

    // Apply rate limiting only for new posts
    const rateLimitCheck = rateLimiter.canRead();
    if (!rateLimitCheck.allowed) {
      toast.error('Calma aí! 🚫', {
        description: rateLimitCheck.reason
      });
      return;
    }

    // Mark in localStorage (fast UI feedback)
    readStore.markAsRead(postId);
    
    // Record insights locally
    if (user) {
      recordPostRead(postId, user, user.classId);
    }
    
    // Record in Supabase (triggers challenge)
    recordRead(postId);
    
    // Record successful read in rate limiter
    rateLimiter.recordRead();
    
    // Force re-render to update UI
    forceUpdate({});
  };

  const isRead = (postId: string): boolean => {
    return readStore.isRead(postId);
  };

  const unmarkAsRead = (postId: string) => {
    readStore.unmarkAsRead(postId);
    forceUpdate({}); // Force re-render
  };

  return {
    markAsRead,
    isRead,
    unmarkAsRead,
    readCount: readStore.getReadCount()
  };
}