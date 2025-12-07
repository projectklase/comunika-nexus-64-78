export type PostType = 'AVISO' | 'COMUNICADO' | 'EVENTO' | 'ATIVIDADE' | 'TRABALHO' | 'PROVA';

export type ActivityType = 'ATIVIDADE' | 'TRABALHO' | 'PROVA';

export type DeliveryFormat = 'PDF' | 'LINK' | 'APRESENTACAO' | 'IMPRESSO' | 'OUTRO';

export type ProofType = 'OBJETIVA' | 'DISCURSIVA' | 'MISTA';

export interface ActivityMeta {
  // Campos comuns
  peso?: number;
  usePeso?: boolean;  // Flag para controlar se deve usar peso nesta atividade
  koinReward?: number; // Koins que o aluno receberá ao concluir esta atividade
  requiresDelivery?: boolean; // Se a atividade requer entrega pelo aluno (padrão: true)
  allow_attachments?: boolean; // Controla se alunos podem enviar anexos
  
  // ATIVIDADE
  rubrica?: string;
  
  // TRABALHO
  formatosEntrega?: DeliveryFormat[];
  formatoCustom?: string;
  permitirGrupo?: boolean;
  
  // PROVA
  duracao?: number; // em minutos
  local?: string;
  tipoProva?: ProofType;
  bloquearAnexosAluno?: boolean;
}

export type PostStatus = 'PUBLISHED' | 'SCHEDULED' | 'CONCLUDED' | 'ARCHIVED';

export type PostAudience = 'GLOBAL' | 'CLASS';

export interface PostAttachment {
  name: string;
  url?: string;
  size?: number;
}

export interface Post {
  id: string;
  type: PostType;
  title: string;
  body?: string;
  attachments?: PostAttachment[];
  classId?: string;         // deprecated, usar classIds
  classIds?: string[];      // múltiplas turmas quando audience='CLASS'
  dueAt?: string;           // usado em ATIVIDADE no futuro
  eventStartAt?: string;    // usado em EVENTO
  eventEndAt?: string;      // usado em EVENTO
  eventLocation?: string;   // usado em EVENTO
  allowInvitations?: boolean; // Permite alunos convidarem amigos (apenas EVENTO)
  // Event capacity control fields
  eventCapacityEnabled?: boolean;
  eventCapacityType?: 'GLOBAL' | 'PER_STUDENT' | null;
  eventMaxParticipants?: number | null;
  eventMaxGuestsPerStudent?: number | null;
  audience: PostAudience;
  authorName: string;       // ex.: "Secretaria Central"
  authorId?: string;        // ID do autor para RBAC de insights
  authorRole?: 'secretaria' | 'professor' | 'aluno' | 'administrador' | 'superadmin';  // role do autor
  createdAt: string;
  status: PostStatus;
  publishAt?: string;       // quando agendar post
  activityMeta?: ActivityMeta; // metadados específicos de atividades
  meta?: Record<string, any>; // metadados adicionais (importante, etc.)
  allow_attachments: boolean; // Controla se alunos podem enviar anexos
  // Campos para compatibilidade com calendário
  postId?: string;
  subtype?: string;
}

export interface PostInput {
  type: PostType;
  title: string;
  body?: string;
  attachments?: PostAttachment[];
  classId?: string;         // deprecated, usar classIds  
  classIds?: string[];      // múltiplas turmas quando audience='CLASS'
  dueAt?: string;
  eventStartAt?: string;
  eventEndAt?: string;
  eventLocation?: string;
  allowInvitations?: boolean; // Permite alunos convidarem amigos (apenas EVENTO)
  // Event capacity control fields
  eventCapacityEnabled?: boolean;
  eventCapacityType?: 'GLOBAL' | 'PER_STUDENT' | null;
  eventMaxParticipants?: number | null;
  eventMaxGuestsPerStudent?: number | null;
  audience: PostAudience;
  status?: PostStatus;
  publishAt?: string;
  activityMeta?: ActivityMeta; // metadados específicos de atividades
  meta?: Record<string, any>; // metadados adicionais (importante, etc.)
  allow_attachments?: boolean; // Controla se alunos podem enviar anexos
}

export interface PostFilter {
  type?: PostType;
  status?: PostStatus;
  query?: string;
  classId?: string;  // para filtrar posts de uma turma específica
  authorRole?: 'secretaria' | 'professor' | 'aluno' | 'administrador' | 'superadmin';  // para filtrar por role do autor
}