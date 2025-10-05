import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { AuditEvent, AuditFilters, CreateAuditEventParams } from '@/types/audit';

// Mascarar dados sensíveis
const sanitizeDiff = (diff: Record<string, any>): Record<string, any> => {
  const sanitized = { ...diff };
  const sensitiveFields = ['password', 'password_hash', 'token', 'secret', 'key'];
  
  Object.keys(sanitized).forEach(field => {
    if (sensitiveFields.some(s => field.toLowerCase().includes(s))) {
      if (sanitized[field].before) sanitized[field].before = '[MASKED]';
      if (sanitized[field].after) sanitized[field].after = '[MASKED]';
    }
  });
  
  return sanitized;
};

interface AuditStore {
  events: AuditEvent[];
  loading: boolean;
  loadEvents: () => Promise<void>;
  getFilteredEvents: (filters: AuditFilters) => AuditEvent[];
  exportEvents: (events: AuditEvent[]) => void;
}

export const useAuditStore = create<AuditStore>((set, get) => ({
  events: [],
  loading: false,

  loadEvents: async () => {
    set({ loading: true });
    try {
      const { data, error } = await (supabase as any)
        .from('audit_events')
        .select('*')
        .order('at', { ascending: false });

      if (error) throw error;

      set({ 
        events: (data || []).map((event: any) => ({
          ...event,
          school_id: event.school_id || 'default',
        })) as AuditEvent[],
        loading: false 
      });
    } catch (error) {
      console.error('Erro ao carregar eventos de auditoria:', error);
      set({ loading: false });
    }
  },

  getFilteredEvents: (filters: AuditFilters) => {
    let filtered = get().events;

    // Filtro de usuário
    if (filters.actor_id && filters.actor_id !== 'ALL_USERS') {
      filtered = filtered.filter(e => e.actor_id === filters.actor_id);
    }

    // Filtro de entidade
    if (filters.entity && filters.entity !== 'ALL_ENTITIES') {
      filtered = filtered.filter(e => e.entity === filters.entity);
    }

    // Filtro de ação
    if (filters.action && filters.action !== 'ALL_ACTIONS') {
      filtered = filtered.filter(e => e.action === filters.action);
    }

    // Filtro de turma
    if (filters.class_id && filters.class_id !== 'ALL_CLASSES') {
      filtered = filtered.filter(e => e.scope === `CLASS:${filters.class_id}`);
    }

    // Filtro de tipo de post
    if (filters.post_type && filters.post_type !== 'ALL_POST_TYPES') {
      filtered = filtered.filter(e => e.meta?.post_type === filters.post_type);
    }

    // Filtro de período
    if (filters.period) {
      const now = new Date();
      let cutoff: Date;

      switch (filters.period) {
        case 'today':
          cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7d':
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoff = new Date(0);
      }

      filtered = filtered.filter(e => new Date(e.at) >= cutoff);
    }

    // Filtro de busca
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(e =>
        e.entity_label.toLowerCase().includes(searchLower) ||
        e.actor_name.toLowerCase().includes(searchLower) ||
        e.actor_email.toLowerCase().includes(searchLower) ||
        e.entity_id.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  },

  exportEvents: (events: AuditEvent[]) => {
    const csvHeader = ['Data/Hora', 'Usuário', 'Email', 'Role', 'Ação', 'Entidade', 'Alvo', 'Escopo'].join(';');
    const csvRows = events.map(event => [
      new Date(event.at).toLocaleString('pt-BR'),
      event.actor_name,
      event.actor_email,
      event.actor_role,
      event.action,
      event.entity,
      event.entity_label,
      event.scope,
    ].join(';'));

    const csvContent = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    link.href = URL.createObjectURL(blob);
    link.download = `historico-auditoria-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  },
}));

/**
 * Função para registrar eventos de auditoria
 * Pode ser chamada de qualquer lugar do app
 */
export const logAudit = async (params: CreateAuditEventParams & {
  actor_id?: string;
  actor_name?: string;
  actor_email?: string;
  actor_role?: string;
}): Promise<void> => {
  // Extract actor info from params
  const { actor_id, actor_name, actor_email, actor_role, ...eventParams } = params;

  if (!actor_id || !actor_name) {
    console.error('Tentativa de registrar evento de auditoria sem informações do ator.');
    return;
  }

  const newEventData = {
    actor_id,
    actor_name,
    actor_email: actor_email || '',
    actor_role: actor_role || 'unknown',
    action: eventParams.action,
    entity: eventParams.entity,
    entity_id: eventParams.entity_id,
    entity_label: eventParams.entity_label,
    scope: eventParams.scope || 'GLOBAL',
    class_name: eventParams.class_name || null,
    diff_json: sanitizeDiff(eventParams.diff_json || {}),
    meta: eventParams.meta || {},
  };

  const { error } = await (supabase as any).from('audit_events').insert(newEventData);

  if (error) {
    console.error('Erro ao registrar evento de auditoria:', error);
  }
};

// Alias for backward compatibility
export const logAuditEvent = logAudit;