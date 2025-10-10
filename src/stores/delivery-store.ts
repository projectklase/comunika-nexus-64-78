import { Delivery, DeliveryInput, DeliveryReview, DeliveryFilter, ActivityMetrics, ReviewStatus } from '@/types/delivery';
import { supabase } from '@/integrations/supabase/client';

class DeliveryStore {
  private subscribers: Set<() => void> = new Set();

  constructor() {
    console.log('DeliveryStore initialized with Supabase');
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in delivery store subscriber:', error);
      }
    });
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private dbRowToDelivery(row: any): Delivery {
    return {
      id: row.id,
      postId: row.post_id,
      studentId: row.student_id,
      studentName: row.student_name,
      classId: row.class_id,
      submittedAt: row.submitted_at,
      reviewStatus: row.review_status as ReviewStatus,
      reviewNote: row.review_note,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      isLate: row.is_late,
      notes: row.notes,
      attachments: row.attachments,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // Criar uma entrega
  async submit(input: DeliveryInput, dueAt?: string): Promise<Delivery> {
    try {
      // Verificar se já existe entrega para este aluno nesta atividade
      const { data: existing } = await supabase
        .from('deliveries')
        .select('id')
        .eq('post_id', input.postId)
        .eq('student_id', input.studentId)
        .maybeSingle();

      if (existing) {
        throw new Error('Entrega já existe para este aluno nesta atividade');
      }

      const now = new Date().toISOString();
      const isLate = dueAt ? new Date(now) > new Date(dueAt) : false;

      const { data, error } = await supabase
        .from('deliveries')
        .insert({
          post_id: input.postId,
          student_id: input.studentId,
          student_name: input.studentName,
          class_id: input.classId,
          submitted_at: now,
          review_status: 'AGUARDANDO',
          is_late: isLate,
          notes: input.notes,
          // Attachments would be handled separately in delivery_attachments table
        })
        .select()
        .single();

      if (error) throw error;

      console.log('New delivery submitted:', data.id, 'for post:', data.post_id);
      this.notifySubscribers();
      return this.dbRowToDelivery(data);
    } catch (error) {
      console.error('Error submitting delivery:', error);
      throw error;
    }
  }

  // Reenviar uma entrega (quando devolvida)
  async resubmit(deliveryId: string, input: Partial<DeliveryInput>, dueAt?: string): Promise<Delivery | null> {
    try {
      const now = new Date().toISOString();
      const isLate = dueAt ? new Date(now) > new Date(dueAt) : false;

      const { data, error } = await supabase
        .from('deliveries')
        .update({
          submitted_at: now,
          review_status: 'AGUARDANDO',
          is_late: isLate,
          review_note: null,
          reviewed_by: null,
          reviewed_at: null,
          notes: input.notes,
          updated_at: now
        })
        .eq('id', deliveryId)
        .select()
        .single();

      if (error) throw error;

      this.notifySubscribers();
      return data ? this.dbRowToDelivery(data) : null;
    } catch (error) {
      console.error('Error resubmitting delivery:', error);
      return null;
    }
  }

  // Revisar uma entrega (aprovar/devolver)
  async review(deliveryId: string, review: DeliveryReview): Promise<Delivery | null> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('deliveries')
        .update({
          review_status: review.reviewStatus,
          review_note: review.reviewNote,
          reviewed_by: review.reviewedBy,
          reviewed_at: now,
          updated_at: now
        })
        .eq('id', deliveryId)
        .select()
        .single();

      if (error) throw error;

      this.notifySubscribers();
      return data ? this.dbRowToDelivery(data) : null;
    } catch (error) {
      console.error('Error reviewing delivery:', error);
      return null;
    }
  }

  // Revisar múltiplas entregas
  async reviewMultiple(deliveryIds: string[], review: DeliveryReview): Promise<Delivery[]> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('deliveries')
        .update({
          review_status: review.reviewStatus,
          review_note: review.reviewNote,
          reviewed_by: review.reviewedBy,
          reviewed_at: now,
          updated_at: now
        })
        .in('id', deliveryIds)
        .select();

      if (error) throw error;

      this.notifySubscribers();
      return data ? data.map(row => this.dbRowToDelivery(row)) : [];
    } catch (error) {
      console.error('Error reviewing multiple deliveries:', error);
      return [];
    }
  }

  // Marcar entrega manual (para entregas offline)
  async markAsReceived(postId: string, studentId: string, studentName: string, classId: string, reviewedBy: string): Promise<Delivery> {
    try {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('deliveries')
        .select('id')
        .eq('post_id', postId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (existing) {
        throw new Error('Entrega já existe para este aluno');
      }

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('deliveries')
        .insert({
          post_id: postId,
          student_id: studentId,
          student_name: studentName,
          class_id: classId,
          submitted_at: now,
          review_status: 'APROVADA',
          review_note: 'Entrega recebida manualmente',
          reviewed_by: reviewedBy,
          reviewed_at: now,
          is_late: false
        })
        .select()
        .single();

      if (error) throw error;

      this.notifySubscribers();
      return this.dbRowToDelivery(data);
    } catch (error) {
      console.error('Error marking delivery as received:', error);
      throw error;
    }
  }

  async list(filter?: DeliveryFilter, page?: number, pageSize?: number): Promise<Delivery[]> {
    if (page === undefined) {
      const result = await this.listPaginated(filter, 1, 999);
      return result.deliveries;
    }
    const result = await this.listPaginated(filter, page, pageSize || 50);
    return result.deliveries;
  }

  async listPaginated(filter?: DeliveryFilter, page = 1, pageSize = 50): Promise<{ deliveries: Delivery[]; total: number }> {
    try {
      let query = supabase.from('deliveries').select('*', { count: 'exact' });

      if (filter?.postId) {
        query = query.eq('post_id', filter.postId);
      }

      if (filter?.classId) {
        query = query.eq('class_id', filter.classId);
      }

      if (filter?.studentId) {
        query = query.eq('student_id', filter.studentId);
      }

      if (filter?.reviewStatus) {
        query = query.eq('review_status', filter.reviewStatus);
      }

      if (filter?.isLate !== undefined) {
        query = query.eq('is_late', filter.isLate);
      }

      // Ordenar por data de submissão (mais recente primeiro)
      query = query.order('submitted_at', { ascending: false });

      // Pagination
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;

      if (error) {
        console.error('[DeliveryStore] Error listing deliveries:', error);
        throw new Error('Não foi possível carregar as entregas. Tente novamente.');
      }

      const deliveries = data ? data.map(row => this.dbRowToDelivery(row)) : [];

      return {
        deliveries,
        total: count || 0
      };
    } catch (error) {
      console.error('[DeliveryStore] Error listing deliveries:', error);
      throw error;
    }
  }

  // Obter entrega por ID
  async getById(id: string): Promise<Delivery | null> {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      return data ? this.dbRowToDelivery(data) : null;
    } catch (error) {
      console.error('Error getting delivery by ID:', error);
      return null;
    }
  }

  // Obter entrega de um aluno para uma atividade específica
  async getByStudentAndPost(studentId: string, postId: string): Promise<Delivery | null> {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('student_id', studentId)
        .eq('post_id', postId)
        .maybeSingle();

      if (error) throw error;

      return data ? this.dbRowToDelivery(data) : null;
    } catch (error) {
      console.error('Error getting delivery by student and post:', error);
      return null;
    }
  }

  // Calcular métricas de uma atividade
  async getActivityMetrics(postId: string, totalStudents: number): Promise<ActivityMetrics> {
    try {
      const deliveries = await this.list({ postId });
      
      const aguardando = deliveries.filter(d => d.reviewStatus === 'AGUARDANDO').length;
      const aprovadas = deliveries.filter(d => d.reviewStatus === 'APROVADA').length;
      const devolvidas = deliveries.filter(d => d.reviewStatus === 'DEVOLVIDA').length;
      const atrasadas = deliveries.filter(d => d.isLate).length;
      const naoEntregue = totalStudents - deliveries.length;
      
      const percentualEntrega = totalStudents > 0 ? (deliveries.length / totalStudents) * 100 : 0;
      const percentualAprovacao = deliveries.length > 0 ? (aprovadas / deliveries.length) * 100 : 0;

      return {
        total: totalStudents,
        naoEntregue,
        aguardando,
        aprovadas,
        devolvidas,
        atrasadas,
        percentualEntrega: Math.round(percentualEntrega),
        percentualAprovacao: Math.round(percentualAprovacao)
      };
    } catch (error) {
      console.error('Error calculating activity metrics:', error);
      return {
        total: totalStudents,
        naoEntregue: totalStudents,
        aguardando: 0,
        aprovadas: 0,
        devolvidas: 0,
        atrasadas: 0,
        percentualEntrega: 0,
        percentualAprovacao: 0
      };
    }
  }

  // Calcular contadores para um professor (todas as atividades)
  async getProfessorMetrics(classIds: string[]): Promise<{
    pendingDeliveries: number;
    weeklyDeadlines: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('id')
        .in('class_id', classIds)
        .eq('review_status', 'AGUARDANDO');

      if (error) throw error;

      // TODO: Implementar cálculo de prazos da semana quando integrar com posts
      return {
        pendingDeliveries: data ? data.length : 0,
        weeklyDeadlines: 0
      };
    } catch (error) {
      console.error('Error getting professor metrics:', error);
      return {
        pendingDeliveries: 0,
        weeklyDeadlines: 0
      };
    }
  }

  // Deletar entrega
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('deliveries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      this.notifySubscribers();
      return true;
    } catch (error) {
      console.error('Error deleting delivery:', error);
      return false;
    }
  }
}

export const deliveryStore = new DeliveryStore();
