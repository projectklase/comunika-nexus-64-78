import { useAuth } from '@/contexts/AuthContext';

/**
 * Helper para pegar contexto do usuário para auditoria
 * Centraliza a lógica de obter informações do usuário
 */
export function getAuditUserContext() {
  // Em uma implementação real, isso deveria ser obtido do contexto de auth
  // Por enquanto, retornamos valores padrão
  return {
    actor_id: 'system', // TODO: Pegar do useAuth() quando disponível
    actor_name: 'Sistema',
    actor_email: 'sistema@escola.com',
    actor_role: 'secretaria'
  };
}

/**
 * Hook para obter contexto do usuário para auditoria
 */
export function useAuditUserContext() {
  // Quando o sistema de auth estiver mais robusto, usar:
  // const { user } = useAuth();
  // return {
  //   actor_id: user?.id || 'unknown',
  //   actor_name: user?.name || 'Desconhecido',
  //   actor_email: user?.email || '',
  //   actor_role: user?.role || 'unknown'
  // };
  
  return getAuditUserContext();
}