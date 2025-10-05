import { supabase } from '@/integrations/supabase/client'; // Ajuste o caminho se for diferente
import { AuditEvent, AuditFilters, CreateAuditEventParams } from '@/types/audit';
import { User } from '@supabase/supabase-js'; // Importar o tipo User do Supabase

// Mascarar dados sensíveis (essa função é ótima e pode ser mantida como está)
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

/**
 * Registra um novo evento de auditoria no Supabase.
 * Esta função deve ser chamada em vários pontos do seu aplicativo (ex: ao criar uma turma).
 * @param params Os dados do evento a ser registrado.
 * @param actor O objeto do usuário autenticado que está realizando a ação.
 */
export const logAuditEvent = async (params: CreateAuditEventParams, actor: User & { name: string, role: string }): Promise<void> => {
  if (!actor) {
    console.error('Tentativa de registrar evento de auditoria sem um ator (usuário).');
    return;
  }

  const newEventData = {
    // Dados do ator (quem fez a ação)
    actor_id: actor.id,
    actor_name: actor.name,
    actor_email: actor.email,
    actor_role: actor.role,

    // O que foi feito
    action: params.action,
    entity: params.entity,
    entity_id: params.entity_id,
    entity_label: params.entity_label,
    
    // Onde foi feito
    scope: params.scope || 'GLOBAL',
    class_name: params.class_name,

    // Detalhes da mudança
    diff_json: sanitizeDiff(params.diff_json || {}),
    meta: params.meta || {},
  };

  const { error } = await supabase.from('audit_events').insert(newEventData);

  if (error) {
    console.error('Erro ao registrar evento de auditoria:', error);
  }
};

/**
 * Busca e filtra o histórico de auditoria do Supabase.
 * @param filters Os filtros a serem aplicados na busca.
 * @returns Uma lista de eventos de auditoria.
 */
export const getFilteredAuditEvents = async (filters: AuditFilters): Promise<AuditEvent[]> => {
  let query = supabase
    .from('audit_events')
    .select('*')
    .order('at', { ascending: false });

  // Aplica filtros na consulta do Supabase (muito mais eficiente)
  if (filters.actor_id && filters.actor_id !== 'ALL_USERS') {
    query = query.eq('actor_id', filters.actor_id);
  }
  if (filters.entity && filters.entity !== 'ALL_ENTITIES') {
    query = query.eq('entity', filters.entity);
  }
  if (filters.action && filters.action !== 'ALL_ACTIONS') {
    query = query.eq('action', filters.action);
  }
  if (filters.search) {
    const searchLower = `%${filters.search}%`;
    query = query.or(`entity_label.ilike.${searchLower},actor_name.ilike.${searchLower},actor_email.ilike.${searchLower}`);
  }
  // Filtro de período (exemplo para "Últimos 7 dias")
  if (filters.period && filters.period !== 'ALL_PERIODS') {
    const date = new Date();
    if (filters.period === '7d') {
      date.setDate(date.getDate() - 7);
      query = query.gte('at', date.toISOString());
    }
    // Adicione outras lógicas para 'today', '30d', etc.
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar histórico de auditoria:', error);
    throw error;
  }

  // O Supabase retorna snake_case. O tipo AuditEvent do seu app já espera snake_case,
  // então o mapeamento é direto. Se precisar de camelCase, teríamos que mapear aqui.
  return data as AuditEvent[];
};

/**
 * Exporta os eventos filtrados para um arquivo CSV.
 * A lógica de geração de CSV pode permanecer no frontend.
 */
export const exportEventsToCsv = (events: AuditEvent[]): void => {
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
};