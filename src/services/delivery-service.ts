import { supabase } from '@/integrations/supabase/client';
import { Delivery, DeliveryInput, DeliveryReview, DeliveryFilter, ActivityMetrics } from '@/types/delivery';

export class DeliveryService {
  // Criar uma entrega
  async submit(input: DeliveryInput, dueAt?: string): Promise<Delivery> {
    console.log('Attempting to submit delivery:', {
      postId: input.postId,
      studentId: input.studentId,
      studentName: input.studentName,
      classId: input.classId
    });

    // Verificar se já existe entrega para este aluno nesta atividade
    const { data: existing, error: checkError } = await supabase
      .from('deliveries')
      .select('id')
      .eq('post_id', input.postId)
      .eq('student_id', input.studentId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing delivery:', checkError);
      throw checkError;
    }

    if (existing) {
      throw new Error('Entrega já existe para este aluno nesta atividade');
    }

    // Buscar post para obter school_id e título
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('school_id, title')
      .eq('id', input.postId)
      .single();

    if (postError || !post) {
      console.error('Error fetching post:', postError);
      throw new Error('Post não encontrado');
    }

    const now = new Date().toISOString();
    const isLate = dueAt ? new Date(now) > new Date(dueAt) : false;

    // Inserir entrega COM school_id
    const { data: delivery, error } = await supabase
      .from('deliveries')
      .insert({
        post_id: input.postId,
        student_id: input.studentId,
        student_name: input.studentName,
        class_id: input.classId,
        school_id: post.school_id,
        notes: input.notes,
        is_late: isLate,
        submitted_at: now
      })
      .select()
      .single();

    if (error) throw error;

    // Criar notificação para professor(es)
    try {
      await supabase.functions.invoke('create-delivery-notification', {
        body: {
          deliveryId: delivery.id,
          postId: input.postId,
          classId: input.classId,
          studentId: input.studentId,
          studentName: input.studentName,
          activityTitle: post.title
        }
      });
      console.log('✅ Delivery notification sent');
    } catch (notifError) {
      // Não falhar a entrega se a notificação falhar
      console.error('⚠️ Failed to send delivery notification:', notifError);
    }

    // Inserir anexos se existirem
    if (input.attachments && input.attachments.length > 0) {
      const attachmentInserts = input.attachments.map(attachment => ({
        delivery_id: delivery.id,
        file_name: attachment.name,
        file_size: attachment.size,
        file_type: attachment.type,
        file_url: attachment.url
      }));

      const { error: attachmentError } = await supabase
        .from('delivery_attachments')
        .insert(attachmentInserts);

      if (attachmentError) throw attachmentError;
    }

    // Buscar entrega completa com anexos
    return this.getById(delivery.id);
  }

  // Reenviar uma entrega (quando devolvida)
  async resubmit(deliveryId: string, input: Partial<DeliveryInput>, dueAt?: string): Promise<Delivery | null> {
    const now = new Date().toISOString();
    const isLate = dueAt ? new Date(now) > new Date(dueAt) : false;

    const { error } = await supabase
      .from('deliveries')
      .update({
        ...input,
        submitted_at: now,
        review_status: 'AGUARDANDO',
        is_late: isLate,
        review_note: null,
        reviewed_by: null,
        reviewed_at: null
      })
      .eq('id', deliveryId);

    if (error) throw error;

    return this.getById(deliveryId);
  }

  // Revisar uma entrega (aprovar/devolver)
  async review(deliveryId: string, review: DeliveryReview): Promise<Delivery | null> {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('deliveries')
      .update({
        review_status: review.reviewStatus,
        review_note: review.reviewNote,
        reviewed_by: review.reviewedBy,
        reviewed_at: now
      })
      .eq('id', deliveryId);

    if (error) throw error;

    return this.getById(deliveryId);
  }

  // Revisar múltiplas entregas
  async reviewMultiple(deliveryIds: string[], review: DeliveryReview): Promise<Delivery[]> {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('deliveries')
      .update({
        review_status: review.reviewStatus,
        review_note: review.reviewNote,
        reviewed_by: review.reviewedBy,
        reviewed_at: now
      })
      .in('id', deliveryIds);

    if (error) throw error;

    // Retornar todas as entregas atualizadas
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select(`
        *,
        delivery_attachments (*)
      `)
      .in('id', deliveryIds);

    return deliveries?.map(this.mapDeliveryFromDb) || [];
  }

  // Marcar entrega manual (para entregas offline)
  async markAsReceived(postId: string, studentId: string, studentName: string, classId: string, reviewedBy: string): Promise<Delivery> {
    // Verificar se já existe
    const { data: existing } = await supabase
      .from('deliveries')
      .select('id')
      .eq('post_id', postId)
      .eq('student_id', studentId)
      .single();

    if (existing) {
      throw new Error('Entrega já existe para este aluno');
    }

    const now = new Date().toISOString();

    const { data: delivery, error } = await supabase
      .from('deliveries')
      .insert({
        post_id: postId,
        student_id: studentId,
        student_name: studentName,
        class_id: classId,
        review_status: 'APROVADA',
        review_note: 'Entrega recebida manualmente',
        reviewed_by: reviewedBy,
        reviewed_at: now,
        is_late: false,
        submitted_at: now
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapDeliveryFromDb(delivery);
  }

  // Listar entregas com filtros
  async list(filter?: DeliveryFilter): Promise<Delivery[]> {
    let query = supabase
      .from('deliveries')
      .select(`
        *,
        delivery_attachments (*)
      `);

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

    const { data, error } = await query;

    if (error) throw error;

    return data?.map(this.mapDeliveryFromDb) || [];
  }

  // Obter entrega por ID
  async getById(id: string): Promise<Delivery> {
    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        *,
        delivery_attachments (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return this.mapDeliveryFromDb(data);
  }

  // Obter entrega de um aluno para uma atividade específica
  async getByStudentAndPost(studentId: string, postId: string): Promise<Delivery | null> {
    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        *,
        delivery_attachments (*)
      `)
      .eq('student_id', studentId)
      .eq('post_id', postId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found

    return data ? this.mapDeliveryFromDb(data) : null;
  }

  // Calcular métricas de uma atividade
  async getActivityMetrics(postId: string, totalStudents: number): Promise<ActivityMetrics> {
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
  }

  // Deletar entrega
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('deliveries')
      .delete()
      .eq('id', id);

    return !error;
  }

  // Mapper helper para converter dados do DB para o tipo Delivery
  private mapDeliveryFromDb(data: any): Delivery {
    return {
      id: data.id,
      postId: data.post_id,
      studentId: data.student_id,
      studentName: data.student_name,
      classId: data.class_id,
      submittedAt: data.submitted_at,
      notes: data.notes,
      reviewStatus: data.review_status,
      reviewNote: data.review_note,
      reviewedBy: data.reviewed_by,
      reviewedAt: data.reviewed_at,
      isLate: data.is_late,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      attachments: data.delivery_attachments?.map((att: any) => ({
        name: att.file_name,
        url: att.file_url,
        size: att.file_size,
        type: att.file_type
      }))
    };
  }
}

export const deliveryService = new DeliveryService();