export type DeliveryStatus = 'NAO_ENTREGUE' | 'ENTREGUE' | 'AGUARDANDO' | 'APROVADA' | 'DEVOLVIDA';

export type ReviewStatus = 'AGUARDANDO' | 'APROVADA' | 'DEVOLVIDA';

export interface DeliveryAttachment {
  name: string;
  url?: string;
  size?: number;
  type?: string;
}

export interface Delivery {
  id: string;
  postId: string; // ID da atividade
  studentId: string;
  studentName: string;
  classId: string;
  
  // Dados da entrega
  submittedAt: string;
  attachments?: DeliveryAttachment[];
  notes?: string; // Observações do aluno
  
  // Status de revisão
  reviewStatus: ReviewStatus;
  reviewNote?: string; // Feedback do professor
  reviewedBy?: string; // ID do professor
  reviewedAt?: string;
  
  // Flags calculadas
  isLate?: boolean; // Se foi entregue após o prazo
  
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryInput {
  postId: string;
  studentId: string;
  studentName: string;
  classId: string;
  attachments?: DeliveryAttachment[];
  notes?: string;
}

export interface DeliveryReview {
  reviewStatus: ReviewStatus;
  reviewNote?: string;
  reviewedBy: string;
}

export interface DeliveryFilter {
  postId?: string;
  classId?: string;
  studentId?: string;
  reviewStatus?: ReviewStatus;
  isLate?: boolean;
  hasAttachments?: boolean;
}

export interface ActivityMetrics {
  total: number;
  naoEntregue: number;
  aguardando: number;
  aprovadas: number;
  devolvidas: number;
  atrasadas: number;
  percentualEntrega: number;
  percentualAprovacao: number;
}