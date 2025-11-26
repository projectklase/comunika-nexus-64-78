import { PasswordResetRequest, PasswordResetStatus } from '@/types/password-reset-request';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notificationStore } from './notification-store';

// Re-export types for backward compatibility
export type { PasswordResetRequest, PasswordResetStatus };

const STORAGE_KEY = 'password_reset_requests';
const MAX_REQUESTS_PER_USER = 5;

class PasswordResetStore {
  private subscribers: Set<() => void> = new Set();
  private requests: PasswordResetRequest[] = [];

  constructor() {
    this.loadFromStorage();
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach((callback) => callback());
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.requests = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.requests));
    } catch (error) {
      console.error('Erro ao salvar solicitações:', error);
    }
  }

  async createRequest(email: string, requesterId: string, requesterName: string, requesterRole: string, reason?: string): Promise<PasswordResetRequest> {
    const userPendingRequests = this.requests.filter(
      r => r.requesterId === requesterId && r.status === 'NEW'
    );

    if (userPendingRequests.length >= MAX_REQUESTS_PER_USER) {
      throw new Error('Você já possui solicitações pendentes. Aguarde o processamento.');
    }

    const newRequest: PasswordResetRequest = {
      id: crypto.randomUUID(),
      email,
      requesterId,
      requesterName,
      requesterRole,
      reason,
      status: 'NEW',
      createdAt: new Date(),
    };

    this.requests.push(newRequest);
    this.saveToStorage();
    this.notifySubscribers();

    try {
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'administrador');

      if (admins) {
        for (const admin of admins) {
          await notificationStore.add({
            userId: admin.user_id,
            type: 'PASSWORD_CHANGE_REQUEST',
            title: '🔑 Nova Solicitação de Redefinição de Senha',
            message: `${requesterName} (${requesterRole}) solicitou redefinição de senha`,
            roleTarget: 'ADMINISTRADOR',
            link: `/admin/dashboard`,
            meta: {
              requestId: newRequest.id,
              requesterId,
              requesterEmail: email,
              requesterName,
              requesterRole,
              reason: reason || 'Sem motivo especificado',
            },
          });
        }
      }
    } catch (error) {
      console.error('Erro ao notificar administradores:', error);
    }

    return newRequest;
  }

  list(filters?: { status?: PasswordResetStatus; email?: string }): PasswordResetRequest[] {
    let filtered = [...this.requests];

    if (filters?.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    if (filters?.email) {
      filtered = filtered.filter(r => 
        r.email.toLowerCase().includes(filters.email!.toLowerCase())
      );
    }

    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getById(id: string): PasswordResetRequest | undefined {
    return this.requests.find(r => r.id === id);
  }

  setStatus(id: string, status: PasswordResetStatus) {
    const request = this.requests.find(r => r.id === id);
    if (request) {
      request.status = status;
      this.saveToStorage();
      this.notifySubscribers();
    }
  }

  async complete(
    id: string,
    options: {
      processedBy: string;
      requiresChangeOnNextLogin: boolean;
      notes?: string;
    }
  ) {
    const request = this.requests.find(r => r.id === id);
    if (!request) return;

    request.status = 'DONE';
    request.processedAt = new Date();
    request.processedBy = options.processedBy;
    request.notes = options.notes;
    request.requiresChangeOnNextLogin = options.requiresChangeOnNextLogin;

    this.saveToStorage();
    this.notifySubscribers();

    try {
      await notificationStore.add({
        userId: request.requesterId,
        type: 'PASSWORD_CHANGED',
        title: '✅ Senha Redefinida com Sucesso',
        message: 'Sua senha foi redefinida pelo administrador',
        roleTarget: request.requesterRole === 'secretaria' ? 'SECRETARIA' : 'PROFESSOR',
        meta: {
          requestId: id,
          requiresChangeOnNextLogin: options.requiresChangeOnNextLogin,
          processedBy: options.processedBy,
          notes: options.notes,
        },
      });
    } catch (error) {
      console.error('Erro ao notificar solicitante:', error);
    }
  }

  cancel(id: string, notes?: string) {
    const request = this.requests.find(r => r.id === id);
    if (request) {
      request.status = 'CANCELED';
      request.processedAt = new Date();
      request.notes = notes;
      this.saveToStorage();
      this.notifySubscribers();
    }
  }

  async resolveUser(id: string, userId: string) {
    const request = this.requests.find(r => r.id === id);
    if (request) {
      request.requesterId = userId;
      this.saveToStorage();
      this.notifySubscribers();
    }
  }

  getStats(): {
    total: number;
    newRequests: number;
    inProgress: number;
    completed: number;
    canceled: number;
  } {
    return {
      total: this.requests.length,
      newRequests: this.requests.filter(r => r.status === 'NEW').length,
      inProgress: this.requests.filter(r => r.status === 'IN_PROGRESS').length,
      completed: this.requests.filter(r => r.status === 'DONE').length,
      canceled: this.requests.filter(r => r.status === 'CANCELED').length,
    };
  }
}

export const passwordResetStore = new PasswordResetStore();
