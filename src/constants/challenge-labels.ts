/**
 * Labels humanizados para o sistema de desafios
 * Todos os textos em português para facilitar o entendimento dos profissionais da escola
 * 
 * IMPORTANTE: Apenas ações com triggers implementados estão listadas aqui.
 * Ações removidas por falta de implementação: COMMENT_POST, LIKE_POST, SHARE_POST, LOGIN_STREAK, PERFECT_SCORE
 */

export const ACTION_TARGET_LABELS: Record<string, string> = {
  READ_POST: 'Ler postagem',
  SUBMIT_ACTIVITY: 'Entregar atividade',
  COMPLETE_PROFILE: 'Completar perfil',
  INVITE_FRIEND: 'Convidar amigo',
  ATTEND_EVENT: 'Comparecer a evento',
} as const;

export const CHALLENGE_TYPE_LABELS: Record<string, string> = {
  DAILY: 'Diário',
  WEEKLY: 'Semanal',
  ACHIEVEMENT: 'Conquista',
} as const;

export const ICON_LABELS: Record<string, string> = {
  target: 'Alvo 🎯',
  trophy: 'Troféu 🏆',
  star: 'Estrela ⭐',
  flame: 'Chama 🔥',
  zap: 'Raio ⚡',
  award: 'Prêmio 🎖️',
  medal: 'Medalha 🏅',
  crown: 'Coroa 👑',
  sparkles: 'Brilho ✨',
  rocket: 'Foguete 🚀',
  heart: 'Coração ❤️',
  book: 'Livro 📚',
  bookmark: 'Marcador 🔖',
  check: 'Concluído ✓',
  clock: 'Relógio ⏰',
  gift: 'Presente 🎁',
  thumbsUp: 'Joinha 👍',
  users: 'Usuários 👥',
  calendar: 'Calendário 📅',
  messageCircle: 'Mensagem 💬',
} as const;

/**
 * Retorna o label humanizado de um action target
 * Se não encontrar, retorna o próprio valor
 */
export function getActionTargetLabel(actionTarget: string): string {
  return ACTION_TARGET_LABELS[actionTarget] || actionTarget;
}

/**
 * Retorna o label humanizado de um tipo de desafio
 * Se não encontrar, retorna o próprio valor
 */
export function getChallengeTypeLabel(type: string): string {
  return CHALLENGE_TYPE_LABELS[type] || type;
}

/**
 * Retorna o label humanizado de um ícone
 * Se não encontrar, retorna o próprio valor
 */
export function getIconLabel(icon: string): string {
  return ICON_LABELS[icon] || icon;
}
