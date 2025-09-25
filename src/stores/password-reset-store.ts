import { AuditService } from '@/services/audit-service';
import { notificationStore } from './notification-store';

export type PasswordResetStatus = 'NEW' | 'IN_PROGRESS' | 'DONE' | 'CANCELED';

export interface PasswordResetRequest {
  id: string;
  email: string;
  userId?: string;
  role?: 'ALUNO' | 'PROFESSOR' | 'SECRETARIA';
  status: PasswordResetStatus;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  requiresChangeOnNextLogin?: boolean;
  notes?: string;
}

class PasswordResetStore {
  private requests: PasswordResetRequest[] = [];
  private storageKey = 'comunika.password_resets.v1';
  private subscribers: Set<() => void> = new Set();
  private rateLimitMap = new Map<string, number>();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.requests = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading password resets from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.requests));
      this.notifySubscribers();
    } catch (error) {
      console.error('Error saving password resets to storage:', error);
    }
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in password reset store subscriber:', error);
      }
    });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private isRateLimited(email: string): boolean {
    const lastRequest = this.rateLimitMap.get(email);
    if (!lastRequest) return false;
    
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return lastRequest > fiveMinutesAgo;
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  createRequest(email: string): PasswordResetRequest {
    // Check rate limit
    if (this.isRateLimited(email)) {
      throw new Error('Aguarde 5 minutos antes de fazer uma nova solicitação para este email.');
    }

    const request: PasswordResetRequest = {
      id: this.generateId(),
      email: email.toLowerCase().trim(),
      status: 'NEW',
      createdAt: new Date().toISOString()
    };

    this.requests.unshift(request);
    this.rateLimitMap.set(email, Date.now());
    this.saveToStorage();

    // Track telemetry
    AuditService.track('passwordReset.requested', 'login-system', { email });

    // Create notification for Secretaria
    notificationStore.add({
      type: 'RESET_REQUESTED',
      title: 'Reset de senha solicitado',
      message: `Solicitação de redefinição de senha para ${email}`,
      roleTarget: 'SECRETARIA',
      link: `/secretaria/seguranca/resets?focus=${request.id}`,
      meta: { email, requestId: request.id }
    });

    return request;
  }

  list(filters?: { status?: PasswordResetStatus; email?: string }): PasswordResetRequest[] {
    let filtered = [...this.requests];

    if (filters?.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    if (filters?.email) {
      const query = filters.email.toLowerCase();
      filtered = filtered.filter(r => r.email.toLowerCase().includes(query));
    }

    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getById(id: string): PasswordResetRequest | undefined {
    return this.requests.find(r => r.id === id);
  }

  setStatus(id: string, status: PasswordResetStatus): void {
    const request = this.requests.find(r => r.id === id);
    if (!request) return;

    request.status = status;
    if (status === 'IN_PROGRESS') {
      // Track telemetry
      AuditService.track('passwordReset.started', 'secretaria-user', { requestId: id });
      
      // Create notification for status update
      notificationStore.add({
        type: 'RESET_IN_PROGRESS',
        title: 'Reset em andamento',
        message: `Reset de senha iniciado para ${request.email}`,
        roleTarget: 'SECRETARIA',
        link: `/secretaria/seguranca/resets?focus=${id}`,
        meta: { email: request.email, requestId: id }
      });
    }
    this.saveToStorage();
  }

  resolveUser(id: string, userId: string, role: 'ALUNO' | 'PROFESSOR' | 'SECRETARIA'): void {
    const request = this.requests.find(r => r.id === id);
    if (!request) return;

    request.userId = userId;
    request.role = role;
    this.saveToStorage();
  }

  complete(id: string, options: { 
    processedBy: string; 
    requiresChangeOnNextLogin: boolean;
    notes?: string;
  }): void {
    const request = this.requests.find(r => r.id === id);
    if (!request) return;

    request.status = 'DONE';
    request.processedAt = new Date().toISOString();
    request.processedBy = options.processedBy;
    request.requiresChangeOnNextLogin = options.requiresChangeOnNextLogin;
    request.notes = options.notes;

    this.saveToStorage();

    // Track telemetry
    AuditService.track('passwordReset.completed', options.processedBy, {
      requestId: id,
      requiresChangeOnNextLogin: options.requiresChangeOnNextLogin,
      userId: request.userId
    });

    // Create completion notification
    notificationStore.add({
      type: 'RESET_COMPLETED',
      title: 'Reset concluído',
      message: `Reset de senha concluído para ${request.email} por ${options.processedBy}`,
      roleTarget: 'SECRETARIA',
      link: `/secretaria/seguranca/resets?focus=${id}`,
      meta: { 
        email: request.email, 
        requestId: id, 
        processedBy: options.processedBy,
        requiresChangeOnNextLogin: options.requiresChangeOnNextLogin
      }
    });
  }

  cancel(id: string, notes?: string): void {
    const request = this.requests.find(r => r.id === id);
    if (!request) return;

    request.status = 'CANCELED';
    request.notes = notes;
    this.saveToStorage();

    // Create cancellation notification
    notificationStore.add({
      type: 'RESET_CANCELLED',
      title: 'Reset cancelado',
      message: `Reset de senha cancelado para ${request.email}`,
      roleTarget: 'SECRETARIA',
      link: `/secretaria/seguranca/resets?focus=${id}`,
      meta: { email: request.email, requestId: id, notes }
    });
  }

  // Get statistics for dashboard
  getStats() {
    const total = this.requests.length;
    const newRequests = this.requests.filter(r => r.status === 'NEW').length;
    const inProgress = this.requests.filter(r => r.status === 'IN_PROGRESS').length;
    const completed = this.requests.filter(r => r.status === 'DONE').length;
    const canceled = this.requests.filter(r => r.status === 'CANCELED').length;

    return { total, newRequests, inProgress, completed, canceled };
  }
}

export const passwordResetStore = new PasswordResetStore();