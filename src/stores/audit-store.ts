import { create } from 'zustand';
import { AuditEvent, AuditFilters, CreateAuditEventParams } from '@/types/audit';
import { useAuth } from '@/contexts/AuthContext';

interface AuditStore {
  events: AuditEvent[];
  loading: boolean;
  
  // CRUD
  loadEvents: () => void;
  logEvent: (params: CreateAuditEventParams) => void;
  getFilteredEvents: (filters: AuditFilters) => AuditEvent[];
  exportEvents: (events: AuditEvent[]) => void;
  
  // Helpers
  getEvent: (id: string) => AuditEvent | undefined;
  getEventsByEntity: (entity: string, entityId: string) => AuditEvent[];
}

const generateId = () => crypto.randomUUID();

const getStorageKey = (schoolId: string) => `audit:${schoolId}`;

const saveToStorage = (events: AuditEvent[], schoolId: string) => {
  const key = getStorageKey(schoolId);
  localStorage.setItem(key, JSON.stringify(events));
};

const loadFromStorage = (schoolId: string): AuditEvent[] => {
  try {
    const key = getStorageKey(schoolId);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

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

export const useAuditStore = create<AuditStore>((set, get) => ({
  events: [],
  loading: false,

  loadEvents: () => {
    const schoolId = 'default'; // TODO: get from auth context when multi-tenant
    const events = loadFromStorage(schoolId);
    set({ events });
  },

  logEvent: (params: CreateAuditEventParams) => {
    // We'll need the user to be passed or handled differently
    // For now, we'll create a placeholder - this will be updated when we add instrumentation
    const schoolId = 'default'; // TODO: get from auth context when multi-tenant
    
    const newEvent: AuditEvent = {
      id: generateId(),
      school_id: schoolId,
      at: new Date().toISOString(),
      
      // Actor - will be filled by logAudit helper
      actor_id: '',
      actor_name: '',
      actor_email: '',
      actor_role: '',
      
      // Action & Entity
      action: params.action,
      entity: params.entity,
      entity_id: params.entity_id,
      entity_label: params.entity_label,
      
      // Scope
      scope: params.scope || 'GLOBAL',
      class_name: params.class_name,
      
      // Meta & Diff
      meta: params.meta || {},
      diff_json: sanitizeDiff(params.diff_json || {}),
    };
    
    const events = [newEvent, ...get().events];
    set({ events });
    saveToStorage(events, schoolId);
  },

  getFilteredEvents: (filters: AuditFilters) => {
    const events = get().events;
    
    return events.filter(event => {
      // Date range
      if (filters.dateRange) {
        const eventDate = new Date(event.at);
        if (eventDate < filters.dateRange.from || eventDate > filters.dateRange.to) {
          return false;
        }
      }
      
      // Period shortcuts
      if (filters.period && filters.period !== 'custom') {
        const now = new Date();
        const eventDate = new Date(event.at);
        
        switch (filters.period) {
          case 'today':
            if (eventDate.toDateString() !== now.toDateString()) return false;
            break;
          case '7d':
            if (eventDate < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) return false;
            break;
          case '30d':
            if (eventDate < new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) return false;
            break;
        }
      }
      
      // Actor
      if (filters.actor_id && filters.actor_id !== 'ALL_USERS' && event.actor_id !== filters.actor_id) {
        return false;
      }
      
      // Entity
      if (filters.entity && filters.entity !== 'ALL_ENTITIES' && event.entity !== filters.entity) {
        return false;
      }
      
      // Action
      if (filters.action && filters.action !== 'ALL_ACTIONS' && event.action !== filters.action) {
        return false;
      }
      
      // Class
      if (filters.class_id && filters.class_id !== 'ALL_CLASSES') {
        if (!event.scope.includes(filters.class_id)) return false;
      }
      
      // Post type
      if (filters.post_type && filters.post_type !== 'ALL_POST_TYPES') {
        if (event.entity !== 'POST' || event.meta.post_type !== filters.post_type) {
          return false;
        }
      }
      
      // Search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchFields = [
          event.entity_label,
          event.actor_name,
          event.actor_email,
          event.entity_id,
        ].join(' ').toLowerCase();
        
        if (!searchFields.includes(searchLower)) return false;
      }
      
      return true;
    });
  },

  exportEvents: (events: AuditEvent[]) => {
    const csvHeader = [
      'Data/Hora',
      'Usuário',
      'Email',
      'Role',
      'Ação',
      'Entidade',
      'Alvo',
      'Escopo',
      'Campos Alterados'
    ].join(';');
    
    const csvRows = events.map(event => [
      new Date(event.at).toLocaleString('pt-BR'),
      event.actor_name,
      event.actor_email,
      event.actor_role,
      event.action,
      event.entity,
      event.entity_label,
      event.scope,
      (event.meta.fields || []).join(', ')
    ].join(';'));
    
    const csvContent = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    link.href = URL.createObjectURL(blob);
    link.download = `historico-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  },

  getEvent: (id: string) => {
    return get().events.find(e => e.id === id);
  },

  getEventsByEntity: (entity: string, entityId: string) => {
    return get().events.filter(e => e.entity === entity && e.entity_id === entityId);
  },
}));

// Helper function to log audit events from outside components
export const logAudit = (params: CreateAuditEventParams & {
  actor_id: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
}) => {
  const { logEvent } = useAuditStore.getState();
  
  // Fill in actor information in the event before logging
  const schoolId = 'default';
  
  const newEvent: AuditEvent = {
    id: generateId(),
    school_id: schoolId,
    at: new Date().toISOString(),
    
    // Actor
    actor_id: params.actor_id,
    actor_name: params.actor_name,
    actor_email: params.actor_email,
    actor_role: params.actor_role,
    
    // Action & Entity
    action: params.action,
    entity: params.entity,
    entity_id: params.entity_id,
    entity_label: params.entity_label,
    
    // Scope
    scope: params.scope || 'GLOBAL',
    class_name: params.class_name,
    
    // Meta & Diff
    meta: params.meta || {},
    diff_json: sanitizeDiff(params.diff_json || {}),
  };
  
  const { events } = useAuditStore.getState();
  const updatedEvents = [newEvent, ...events];
  useAuditStore.setState({ events: updatedEvents });
  saveToStorage(updatedEvents, schoolId);
};