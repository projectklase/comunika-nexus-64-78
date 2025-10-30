import { UserRole } from '@/types/auth';

/**
 * Roles que podem acessar funcionalidades de gestão/cadastros
 */
export const MANAGEMENT_ROLES: UserRole[] = ['secretaria', 'administrador'];

/**
 * Verifica se o role tem permissão para acessar funcionalidades de gestão
 * (Turmas, Alunos, Professores, Catálogo, Programas, etc.)
 */
export function canAccessManagement(role: UserRole | undefined): boolean {
  if (!role) return false;
  return MANAGEMENT_ROLES.includes(role);
}

/**
 * Roles que podem acessar funcionalidades operacionais
 * (Calendário, Histórico, Recompensas, Desafios)
 */
export const OPERATIONAL_ROLES: UserRole[] = ['secretaria', 'administrador'];

/**
 * Verifica se o role tem permissão para acessar funcionalidades operacionais
 * (Calendário, Histórico, Recompensas, Desafios)
 */
export function canAccessOperations(role: UserRole | undefined): boolean {
  if (!role) return false;
  return OPERATIONAL_ROLES.includes(role);
}
