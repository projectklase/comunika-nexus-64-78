import { Delivery, DeliveryInput, DeliveryReview, DeliveryFilter, ActivityMetrics, ReviewStatus } from '@/types/delivery';
import { Post } from '@/types/post';

class DeliveryStore {
  private deliveries: Delivery[] = [];
  private storageKey = 'comunika_deliveries';

  constructor() {
    this.loadFromStorage();
    this.initializeWithMockData();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.deliveries = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading deliveries from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.deliveries));
    } catch (error) {
      console.error('Error saving deliveries to storage:', error);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Criar uma entrega
  submit(input: DeliveryInput, dueAt?: string): Delivery {
    // Verificar se já existe entrega para este aluno nesta atividade
    const existing = this.deliveries.find(
      d => d.postId === input.postId && d.studentId === input.studentId
    );

    if (existing) {
      throw new Error('Entrega já existe para este aluno nesta atividade');
    }

    const now = new Date().toISOString();
    const isLate = dueAt ? new Date(now) > new Date(dueAt) : false;

    const delivery: Delivery = {
      id: this.generateId(),
      ...input,
      submittedAt: now,
      reviewStatus: 'AGUARDANDO',
      isLate,
      createdAt: now,
      updatedAt: now
    };

    this.deliveries.push(delivery);
    this.saveToStorage();
    return delivery;
  }

  // Reenviar uma entrega (quando devolvida)
  resubmit(deliveryId: string, input: Partial<DeliveryInput>, dueAt?: string): Delivery | null {
    const index = this.deliveries.findIndex(d => d.id === deliveryId);
    if (index === -1) return null;

    const delivery = this.deliveries[index];
    const now = new Date().toISOString();
    const isLate = dueAt ? new Date(now) > new Date(dueAt) : false;

    this.deliveries[index] = {
      ...delivery,
      ...input,
      submittedAt: now,
      reviewStatus: 'AGUARDANDO',
      isLate,
      reviewNote: undefined, // Limpar feedback anterior
      reviewedBy: undefined,
      reviewedAt: undefined,
      updatedAt: now
    };

    this.saveToStorage();
    return this.deliveries[index];
  }

  // Revisar uma entrega (aprovar/devolver)
  review(deliveryId: string, review: DeliveryReview): Delivery | null {
    const index = this.deliveries.findIndex(d => d.id === deliveryId);
    if (index === -1) return null;

    const now = new Date().toISOString();
    this.deliveries[index] = {
      ...this.deliveries[index],
      reviewStatus: review.reviewStatus,
      reviewNote: review.reviewNote,
      reviewedBy: review.reviewedBy,
      reviewedAt: now,
      updatedAt: now
    };

    this.saveToStorage();
    return this.deliveries[index];
  }

  // Revisar múltiplas entregas
  reviewMultiple(deliveryIds: string[], review: DeliveryReview): Delivery[] {
    const updated: Delivery[] = [];
    const now = new Date().toISOString();

    deliveryIds.forEach(id => {
      const index = this.deliveries.findIndex(d => d.id === id);
      if (index !== -1) {
        this.deliveries[index] = {
          ...this.deliveries[index],
          reviewStatus: review.reviewStatus,
          reviewNote: review.reviewNote,
          reviewedBy: review.reviewedBy,
          reviewedAt: now,
          updatedAt: now
        };
        updated.push(this.deliveries[index]);
      }
    });

    this.saveToStorage();
    return updated;
  }

  // Marcar entrega manual (para entregas offline)
  markAsReceived(postId: string, studentId: string, studentName: string, classId: string, reviewedBy: string): Delivery {
    // Verificar se já existe
    const existing = this.deliveries.find(
      d => d.postId === postId && d.studentId === studentId
    );

    if (existing) {
      throw new Error('Entrega já existe para este aluno');
    }

    const now = new Date().toISOString();
    const delivery: Delivery = {
      id: this.generateId(),
      postId,
      studentId,
      studentName,
      classId,
      submittedAt: now,
      reviewStatus: 'APROVADA',
      reviewNote: 'Entrega recebida manualmente',
      reviewedBy,
      reviewedAt: now,
      isLate: false,
      createdAt: now,
      updatedAt: now
    };

    this.deliveries.push(delivery);
    this.saveToStorage();
    return delivery;
  }

  // Listar entregas com filtros
  list(filter?: DeliveryFilter): Delivery[] {
    let filtered = [...this.deliveries];

    if (filter?.postId) {
      filtered = filtered.filter(d => d.postId === filter.postId);
    }

    if (filter?.classId) {
      filtered = filtered.filter(d => d.classId === filter.classId);
    }

    if (filter?.studentId) {
      filtered = filtered.filter(d => d.studentId === filter.studentId);
    }

    if (filter?.reviewStatus) {
      filtered = filtered.filter(d => d.reviewStatus === filter.reviewStatus);
    }

    if (filter?.isLate !== undefined) {
      filtered = filtered.filter(d => Boolean(d.isLate) === filter.isLate);
    }

    if (filter?.hasAttachments !== undefined) {
      filtered = filtered.filter(d => {
        const hasAttachments = Boolean(d.attachments && d.attachments.length > 0);
        return hasAttachments === filter.hasAttachments;
      });
    }

    // Ordenar por data de submissão (mais recente primeiro)
    return filtered.sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }

  // Obter entrega por ID
  getById(id: string): Delivery | null {
    return this.deliveries.find(d => d.id === id) || null;
  }

  // Obter entrega de um aluno para uma atividade específica
  getByStudentAndPost(studentId: string, postId: string): Delivery | null {
    return this.deliveries.find(d => d.studentId === studentId && d.postId === postId) || null;
  }

  // Calcular métricas de uma atividade
  getActivityMetrics(postId: string, totalStudents: number): ActivityMetrics {
    const deliveries = this.list({ postId });
    
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

  // Calcular contadores para um professor (todas as atividades)
  getProfessorMetrics(classIds: string[]): {
    pendingDeliveries: number;
    weeklyDeadlines: number;
  } {
    const deliveries = this.deliveries.filter(d => 
      classIds.includes(d.classId) && d.reviewStatus === 'AGUARDANDO'
    );

    // TODO: Implementar cálculo de prazos da semana quando integrar com posts
    return {
      pendingDeliveries: deliveries.length,
      weeklyDeadlines: 0
    };
  }

  // Deletar entrega
  delete(id: string): boolean {
    const initialLength = this.deliveries.length;
    this.deliveries = this.deliveries.filter(d => d.id !== id);
    const success = this.deliveries.length < initialLength;
    if (success) {
      this.saveToStorage();
    }
    return success;
  }

  // Dados mock para desenvolvimento
  private initializeWithMockData() {
    if (this.deliveries.length === 0) {
      const mockDeliveries: Delivery[] = [
        {
          id: 'delivery-1',
          postId: 'atividade-1',
          studentId: 'student-1',
          studentName: 'Ana Silva',
          classId: 'class-3a',
          submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 dias atrás
          reviewStatus: 'AGUARDANDO',
          isLate: false,
          attachments: [
            { name: 'relatorio-fisica.pdf', size: 1024000, type: 'application/pdf' }
          ],
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'delivery-2',
          postId: 'trabalho-1',
          studentId: 'student-2',
          studentName: 'Carlos Santos',
          classId: 'class-3a',
          submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 dia atrás
          reviewStatus: 'APROVADA',
          reviewNote: 'Excelente trabalho! Boa análise dos impactos ambientais.',
          reviewedBy: 'prof-joao',
          reviewedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 horas atrás
          isLate: false,
          attachments: [
            { name: 'redacao-impactos.docx', size: 512000, type: 'application/msword' }
          ],
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'delivery-3',
          postId: 'prova-1',
          studentId: 'student-3',
          studentName: 'Maria Costa',
          classId: 'class-3a',
          submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dias atrás
          reviewStatus: 'DEVOLVIDA',
          reviewNote: 'Revisar as questões sobre fontes exponenciais. Refazer e reenviar.',
          reviewedBy: 'prof-joao',
          reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 dias atrás
          isLate: true,
          notes: 'Tive dificuldades com as questões 3 e 4',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      this.deliveries = mockDeliveries;
      this.saveToStorage();
    }
  }
}

export const deliveryStore = new DeliveryStore();