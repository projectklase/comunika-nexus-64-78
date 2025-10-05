import { supabase } from './path/to/your/supabaseClient'; // <-- IMPORTANTE: Ajuste o caminho para seu cliente Supabase

// As definições de tipo continuam as mesmas, estão perfeitas.
export type NotificationType =
  | 'RESET_REQUESTED'
  | 'RESET_IN_PROGRESS'
  | 'RESET_COMPLETED'
  | 'RESET_CANCELLED'
  | 'POST_NEW'
  | 'POST_IMPORTANT'
  | 'HOLIDAY'
  | 'KOINS_EARNED'
  | 'KOIN_BONUS'
  | 'REDEMPTION_REQUESTED'
  | 'REDEMPTION_APPROVED'
  | 'REDEMPTION_REJECTED';

export type NotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED';
export type RoleTarget = 'SECRETARIA' | 'PROFESSOR' | 'ALUNO';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  role_target: RoleTarget; // snake_case para combinar com o banco de dados
  status: NotificationStatus;
  created_at: string; // snake_case
  link?: string;
  meta?: Record<string, any>;
  user_id: string; // Adicionado para ligar a notificação a um usuário
}

// Objeto de filtros para a função de listagem
interface NotificationFilters {
  status?: NotificationStatus;
  search?: string;
  limit?: number;
  roleTarget?: RoleTarget;
  type?: NotificationType;
  userId?: string; // Para buscar notificações de um usuário específico
}

// NOVA ABORDAGEM: Funções de serviço que falam diretamente com o Supabase

/**
 * Lista as notificações com base nos filtros.
 * Substitui o método list() e loadFromStorage().
 */
export const listNotifications = async (filters: NotificationFilters): Promise<Notification[]> => {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.roleTarget) {
    query = query.eq('role_target', filters.roleTarget);
  }
  if (filters.type) {
    query = query.eq('type', filters.type);
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.search) {
    // Busca por título OU mensagem
    query = query.or(`title.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao listar notificações:', error);
    throw error;
  }

  return data as Notification[];
};

/**
 * Adiciona uma nova notificação no banco de dados.
 * Substitui o método add().
 */
export const addNotification = async (
  notification: Omit<Notification, 'id' | 'created_at' | 'status'>
): Promise<Notification> => {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      ...notification,
      status: 'UNREAD',
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao adicionar notificação:', error);
    throw error;
  }
  return data as Notification;
};

/**
 * Marca uma notificação específica como lida.
 * Substitui o método markRead().
 */
export const markAsRead = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ status: 'READ', is_read: true }) // Atualiza ambos os campos para compatibilidade
    .eq('id', id);

  if (error) {
    console.error('Erro ao marcar como lida:', error);
    throw error;
  }
};

/**
 * Marca todas as notificações não lidas de um perfil como lidas.
 * Substitui o método markAllRead().
 */
export const markAllAsRead = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ status: 'READ', is_read: true })
    .eq('user_id', userId)
    .eq('status', 'UNREAD');

  if (error) {
    console.error('Erro ao marcar todas como lidas:', error);
    throw error;
  }
};

/**
 * Deleta uma notificação específica.
 * Substitui o método delete().
 */
export const deleteNotification = async (id: string): Promise<void> => {
  const { error } = await supabase.from('notifications').delete().eq('id', id);

  if (error) {
    console.error('Erro ao deletar notificação:', error);
    throw error;
  }
};

// ... Você pode adicionar outras funções como 'archive', 'getStats' seguindo o mesmo padrão de chamada ao Supabase.