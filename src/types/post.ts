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

export type PostStatus = 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED';

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
  audience: PostAudience;
  authorName: string;       // ex.: "Secretaria Central"
  authorId?: string;        // ID do autor para RBAC de insights
  authorRole?: 'secretaria' | 'professor' | 'aluno';  // role do autor
  createdAt: string;
  status: PostStatus;
  publishAt?: string;       // quando agendar post
  activityMeta?: ActivityMeta; // metadados específicos de atividades
  meta?: Record<string, any>; // metadados adicionais (importante, etc.)
  allowInvitations?: boolean; // Permite convites de amigos (apenas EVENTO)
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
  audience: PostAudience;
  status?: PostStatus;
  publishAt?: string;
  activityMeta?: ActivityMeta; // metadados específicos de atividades
  meta?: Record<string, any>; // metadados adicionais (importante, etc.)
  allowInvitations?: boolean; // Permite convites de amigos (apenas EVENTO)
}

export interface PostFilter {
  type?: PostType;
  status?: PostStatus;
  query?: string;
  classId?: string;  // para filtrar posts de uma turma específica
  authorRole?: 'secretaria' | 'professor' | 'aluno';  // para filtrar por role do autor
}