import { useState, useEffect, useCallback } from 'react';

interface LoginAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

const STORAGE_KEY = 'comunika.loginAttempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutos em ms

export function useLoginRateLimit() {
  const [attempts, setAttempts] = useState<Record<string, LoginAttempt>>({});
  
  // Carregar do localStorage na montagem
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Limpar bloqueios expirados
        const cleaned = Object.entries(parsed).reduce((acc, [email, data]) => {
          const attempt = data as LoginAttempt;
          if (attempt.lockedUntil && attempt.lockedUntil > Date.now()) {
            acc[email] = attempt;
          } else if (attempt.count > 0 && Date.now() - attempt.lastAttempt < LOCKOUT_DURATION) {
            acc[email] = attempt;
          }
          return acc;
        }, {} as Record<string, LoginAttempt>);
        setAttempts(cleaned);
      } catch (error) {
        console.error('Error loading login attempts from localStorage:', error);
      }
    }
  }, []);
  
  // Salvar no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
  }, [attempts]);
  
  const normalizeEmail = (email: string) => email.toLowerCase().trim();
  
  const isLocked = useCallback((email: string): boolean => {
    const key = normalizeEmail(email);
    const attempt = attempts[key];
    if (!attempt) return false;
    if (attempt.lockedUntil && attempt.lockedUntil > Date.now()) return true;
    return false;
  }, [attempts]);
  
  const getRemainingLockTime = useCallback((email: string): number => {
    const key = normalizeEmail(email);
    const attempt = attempts[key];
    if (!attempt?.lockedUntil) return 0;
    const remaining = attempt.lockedUntil - Date.now();
    return remaining > 0 ? remaining : 0;
  }, [attempts]);
  
  const recordFailedAttempt = useCallback((email: string) => {
    const key = normalizeEmail(email);
    setAttempts(prev => {
      const current = prev[key] || { count: 0, lastAttempt: 0, lockedUntil: null };
      const newCount = current.count + 1;
      
      return {
        ...prev,
        [key]: {
          count: newCount,
          lastAttempt: Date.now(),
          lockedUntil: newCount >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_DURATION : null,
        }
      };
    });
  }, []);
  
  const resetAttempts = useCallback((email: string) => {
    const key = normalizeEmail(email);
    setAttempts(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, []);
  
  const getAttemptsRemaining = useCallback((email: string): number => {
    const key = normalizeEmail(email);
    const attempt = attempts[key];
    if (!attempt) return MAX_ATTEMPTS;
    return Math.max(0, MAX_ATTEMPTS - attempt.count);
  }, [attempts]);
  
  return {
    isLocked,
    getRemainingLockTime,
    recordFailedAttempt,
    resetAttempts,
    getAttemptsRemaining,
    MAX_ATTEMPTS,
  };
}
