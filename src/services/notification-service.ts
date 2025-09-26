import { supabase } from '@/integrations/supabase/client';

interface NotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  meta?: Record<string, any>;
}

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  meta?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export class NotificationService {
  // Criar notificação
  async create(input: NotificationInput): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        meta: input.meta
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapNotificationFromDb(data);
  }

  // Listar notificações do usuário
  async list(userId: string, limit = 50): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data?.map(this.mapNotificationFromDb) || [];
  }

  // Marcar como lida
  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw error;
  }

  // Marcar todas como lidas
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  }

  // Contar não lidas
  async countUnread(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    return count || 0;
  }

  // Deletar notificação
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Notificar professor sobre nova entrega
  async notifyDeliverySubmitted(teacherId: string, deliveryData: {
    studentName: string;
    activityTitle: string;
    activityId: string;
    classId: string;
    deliveryId: string;
  }): Promise<void> {
    await this.create({
      userId: teacherId,
      type: 'DELIVERY_SUBMITTED',
      title: 'Nova entrega recebida',
      message: `${deliveryData.studentName} entregou a atividade "${deliveryData.activityTitle}".`,
      link: `/professor/turma/${deliveryData.classId}/atividade/${deliveryData.activityId}?tab=entregas`,
      meta: {
        activityId: deliveryData.activityId,
        classId: deliveryData.classId,
        deliveryId: deliveryData.deliveryId,
        studentName: deliveryData.studentName,
        activityTitle: deliveryData.activityTitle
      }
    });
  }

  // Notificar aluno sobre correção
  async notifyDeliveryReviewed(studentId: string, reviewData: {
    activityTitle: string;
    activityId: string;
    classId: string;
    deliveryId: string;
    reviewStatus: 'APROVADA' | 'DEVOLVIDA';
    reviewNote?: string;
  }): Promise<void> {
    const isApproved = reviewData.reviewStatus === 'APROVADA';
    
    await this.create({
      userId: studentId,
      type: `DELIVERY_${reviewData.reviewStatus}`,
      title: isApproved ? 'Atividade aprovada!' : 'Atividade devolvida',
      message: isApproved 
        ? `Sua atividade "${reviewData.activityTitle}" foi aprovada pelo professor.`
        : `Sua atividade "${reviewData.activityTitle}" foi devolvida para correção.`,
      link: `/aluno/atividade/${reviewData.activityId}/resultado`,
      meta: {
        activityId: reviewData.activityId,
        classId: reviewData.classId,
        deliveryId: reviewData.deliveryId,
        activityTitle: reviewData.activityTitle,
        reviewStatus: reviewData.reviewStatus,
        reviewNote: reviewData.reviewNote
      }
    });
  }

  // Subscribe para notificações em tempo real
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notification = this.mapNotificationFromDb(payload.new);
          callback(notification);
        }
      )
      .subscribe();
  }

  // Mapper helper
  private mapNotificationFromDb(data: any): Notification {
    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link,
      meta: data.meta,
      isRead: data.is_read,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

export const notificationService = new NotificationService();