import { supabase } from '@/integrations/supabase/client'; // Ajuste o caminho se for diferente
import type { RewardItem, KoinTransaction, RedemptionRequest } from '@/types/rewards';
import { User } from '@supabase/supabase-js';

// ========== FUNÇÕES DE LEITURA (GET) ==========

/**
 * Busca os itens da loja, com filtros opcionais.
 */
export const getRewardItems = async (filters: { searchTerm?: string; sortBy?: 'name' | 'price-asc' | 'price-desc' } = {}): Promise<RewardItem[]> => {
  let query = supabase.from('reward_items').select('*').eq('is_active', true);

  if (filters.searchTerm) {
    query = query.ilike('name', `%${filters.searchTerm}%`);
  }

  switch (filters.sortBy) {
    case 'price-asc':
      query = query.order('price_koins', { ascending: true });
      break;
    case 'price-desc':
      query = query.order('price_koins', { ascending: false });
      break;
    default:
      query = query.order('name', { ascending: true });
  }

  const { data, error } = await query;
  if (error) throw error;
  // Mapear snake_case para camelCase se seus types usarem camelCase
  return data.map(item => ({ ...item, koinPrice: item.price_koins, isActive: item.is_active })) as RewardItem[];
};

/**
 * Busca o saldo de Koins de um usuário específico.
 */
export const getStudentKoinBalance = async (studentId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('koins')
    .eq('id', studentId)
    .single();

  if (error) {
    console.error('Erro ao buscar saldo de Koins:', error);
    return 0;
  }
  return data?.koins ?? 0;
};

/**
 * Busca o histórico de transações de um usuário.
 */
export const getKoinTransactions = async (studentId: string): Promise<KoinTransaction[]> => {
  const { data, error } = await supabase
    .from('koin_transactions')
    .select('*')
    .eq('user_id', studentId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  // Mapear snake_case para camelCase se necessário
  return data as KoinTransaction[];
};

/**
 * Busca os pedidos de resgate (para a Secretaria).
 */
export const getRedemptionRequests = async (status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING'): Promise<any[]> => {
    // Query mais complexa para buscar nomes do aluno e do item
    const { data, error } = await supabase
    .from('redemption_requests')
    .select(`
      id,
      status,
      requested_at,
      student:profiles!student_id(id, name),
      item:reward_items!item_id(id, name, price_koins)
    `)
    .eq('status', status)
    .order('requested_at', { ascending: true });

  if (error) throw error;
  return data;
};


// ========== FUNÇÕES DE ESCRITA (AÇÕES) ==========

/**
 * Função central para adicionar ou remover Koins de um usuário.
 * IMPORTANTE: Esta função deve ser chamada por uma Edge Function segura para evitar manipulação.
 * @param studentId ID do aluno
 * @param amount Valor a ser adicionado (positivo) ou removido (negativo)
 * @param type Tipo da transação
 * @param description Descrição para o histórico
 * @param relatedEntityId ID da entidade relacionada (tarefa, resgate, etc.)
 * @param processedBy ID de quem processou a ação
 */
export const addKoins = async (studentId: string, amount: number, type: KoinTransaction['type'], description: string, relatedEntityId?: string, processedBy?: string) => {
  // 1. Chamar uma RPC (função no Supabase) para atualizar o saldo atomicamente e evitar condições de corrida
  const { data: profile, error: rpcError } = await supabase.rpc('add_koins_to_user', {
    user_id_in: studentId,
    amount_in: amount
  });

  if (rpcError) throw rpcError;

  // 2. Registrar a transação no histórico
  const { error: txError } = await supabase.from('koin_transactions').insert({
    user_id: studentId,
    amount,
    type,
    description,
    related_entity_id: relatedEntityId,
    processed_by: processedBy,
  });

  if (txError) throw txError;
  
  return profile;
};

/**
 * Aluno solicita o resgate de um item.
 */
export const requestRedemption = async (studentId: string, itemId: string): Promise<void> => {
  // Idealmente, a lógica de verificação de saldo e estoque ocorreria em uma Edge Function para segurança.
  // Aqui, simulamos a chamada para a função que faria isso.
  const { data, error } = await supabase.rpc('request_redemption', {
    p_student_id: studentId,
    p_item_id: itemId
  });

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Secretaria aprova um pedido de resgate.
 * IMPORTANTE: Deve ser chamada por uma Edge Function segura.
 */
export const approveRedemption = async (redemptionId: string, approvedBy: string): Promise<void> => {
  const { error } = await supabase.rpc('approve_redemption', {
    p_redemption_id: redemptionId,
    p_admin_id: approvedBy
  });
  if (error) throw new Error(error.message);
};

/**
 * Secretaria rejeita um pedido de resgate.
 * IMPORTANTE: Deve ser chamada por uma Edge Function segura.
 */
export const rejectRedemption = async (redemptionId: string, rejectedBy: string, reason: string): Promise<void> => {
  const { error } = await supabase.rpc('reject_redemption', {
    p_redemption_id: redemptionId,
    p_admin_id: rejectedBy,
    p_reason: reason
  });
  if (error) throw new Error(error.message);
};

// ... Funções para gerenciar itens da loja (addItem, updateItem, etc.) seguiriam o mesmo padrão
// de exportar funções async que chamam o Supabase.