export type AuditAction = 
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'ARCHIVE' | 'PUBLISH' | 'SCHEDULE' 
  | 'DELIVER' | 'ASSIGN' | 'REMOVE' | 'IMPORT' | 'EXPORT' | 'READ'
  | 'REQUEST_REDEMPTION' | 'APPROVE_REDEMPTION' | 'REJECT_REDEMPTION'
  | 'SECURITY_PASSWORD_RESET_FORCED';

export type AuditEntity = 
  | 'POST' | 'CLASS' | 'STUDENT' | 'TEACHER' | 'USER' | 'MEMBERSHIP' 
  | 'SUBJECT' | 'LEVEL' | 'MODALIDADE' | 'PROGRAM' | 'ATTACHMENT' | 'REDEMPTION';

export type AuditScope = 'GLOBAL' | `CLASS:${string}`;

export interface AuditEvent {
  id: string;
  school_id: string;
  at: string; // ISO string
  
  // Actor (quem fez)
  actor_id: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  
  // Action & Entity (o que foi feito)
  action: AuditAction;
  entity: AuditEntity;
  entity_id: string;
  entity_label: string; // título/nome para exibir
  
  // Scope (contexto)
  scope: AuditScope;
  class_name?: string; // quando scope é CLASS:id
  
  // Metadata
  meta: {
    fields?: string[]; // campos alterados
    post_type?: string;
    subtype?: string;
    status_before?: string;
    status_after?: string;
    [key: string]: any;
  };
  
  // Diff (antes/depois)
  diff_json?: Record<string, {
    before: any;
    after: any;
  }> | null;
}

export interface AuditFilters {
  dateRange?: {
    from: Date;
    to: Date;
  };
  period?: 'today' | '7d' | '30d' | 'custom';
  actor_id?: string;
  entity?: AuditEntity | 'ALL_ENTITIES';
  action?: AuditAction | 'ALL_ACTIONS';
  class_id?: string | 'ALL_CLASSES';
  post_type?: string | 'ALL_POST_TYPES';
  search?: string;
}

export interface CreateAuditEventParams {
  action: AuditAction;
  entity: AuditEntity;
  entity_id: string;
  entity_label: string;
  school_id?: string;
  scope?: AuditScope;
  class_name?: string;
  meta?: Record<string, any>;
  diff_json?: Record<string, { before: any; after: any }>;
}