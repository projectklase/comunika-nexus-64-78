/**
 * Sistema de rascunhos para formulários
 */

interface FormDraft<T = any> {
  data: T;
  timestamp: number;
  userId?: string;
}

const DRAFT_PREFIX = 'lovable_draft_';
const DRAFT_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Salva rascunho no localStorage
 */
export function saveDraft<T>(key: string, data: T, userId?: string): void {
  try {
    const draft: FormDraft<T> = {
      data,
      timestamp: Date.now(),
      userId,
    };
    
    localStorage.setItem(`${DRAFT_PREFIX}${key}`, JSON.stringify(draft));
  } catch (error) {
    console.warn('Erro ao salvar rascunho:', error);
  }
}

/**
 * Restaura rascunho do localStorage
 */
export function restoreDraft<T>(key: string, userId?: string): T | null {
  try {
    const stored = localStorage.getItem(`${DRAFT_PREFIX}${key}`);
    if (!stored) return null;

    const draft: FormDraft<T> = JSON.parse(stored);
    
    // Verificar expiração
    if (Date.now() - draft.timestamp > DRAFT_EXPIRY) {
      clearDraft(key);
      return null;
    }

    // Verificar usuário (se fornecido)
    if (userId && draft.userId && draft.userId !== userId) {
      return null;
    }

    return draft.data;
  } catch (error) {
    console.warn('Erro ao restaurar rascunho:', error);
    return null;
  }
}

/**
 * Remove rascunho do localStorage
 */
export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}${key}`);
  } catch (error) {
    console.warn('Erro ao limpar rascunho:', error);
  }
}

/**
 * Lista todos os rascunhos do usuário
 */
export function listDrafts(userId?: string): string[] {
  try {
    const keys: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(DRAFT_PREFIX)) continue;

      const stored = localStorage.getItem(key);
      if (!stored) continue;

      try {
        const draft: FormDraft = JSON.parse(stored);
        
        // Verificar expiração
        if (Date.now() - draft.timestamp > DRAFT_EXPIRY) {
          localStorage.removeItem(key);
          continue;
        }

        // Verificar usuário
        if (userId && draft.userId && draft.userId !== userId) {
          continue;
        }

        keys.push(key.replace(DRAFT_PREFIX, ''));
      } catch {
        // Ignorar erros de parse
      }
    }

    return keys;
  } catch (error) {
    console.warn('Erro ao listar rascunhos:', error);
    return [];
  }
}

/**
 * Limpa rascunhos expirados
 */
export function cleanupExpiredDrafts(): void {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(DRAFT_PREFIX)) continue;

      const stored = localStorage.getItem(key);
      if (!stored) continue;

      try {
        const draft: FormDraft = JSON.parse(stored);
        if (Date.now() - draft.timestamp > DRAFT_EXPIRY) {
          keysToRemove.push(key);
        }
      } catch {
        keysToRemove.push(key); // Remove drafts mal formados
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Erro ao limpar rascunhos expirados:', error);
  }
}