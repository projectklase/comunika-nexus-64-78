import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';

interface PermissionData {
  secretaria_id: string;
  permission_key: string;
  permission_value: {
    schools: string[] | '*';
  };
  school_id?: string;
  granted_by?: string;
}

/**
 * Hook para gerenciar permissões granulares de secretárias.
 * Permite que administradores concedam/removam acesso a múltiplas escolas.
 */
export function useSecretariaPermissions() {
  const { user } = useAuth();
  const { currentSchool } = useSchool();
  const [loading, setLoading] = useState(false);

  /**
   * Conceder permissão de acesso a múltiplas escolas para uma secretária
   */
  const grantSchoolAccess = useCallback(async (
    secretariaId: string,
    schoolIds: string[] | '*'
  ) => {
    if (!user || !currentSchool) {
      toast.error('Sessão inválida');
      return;
    }

    setLoading(true);
    try {
      console.log('🔑 [Permissions] Concedendo acesso para:', secretariaId);
      console.log('🔑 [Permissions] Escolas:', schoolIds);

      const permissionData: PermissionData = {
        secretaria_id: secretariaId,
        permission_key: 'manage_all_schools',
        permission_value: { schools: schoolIds },
        school_id: currentSchool.id,
        granted_by: user.id,
      };

      // Upsert: atualiza se existe, cria se não existe
      const { error } = await supabase
        .from('secretaria_permissions')
        .upsert(permissionData, {
          onConflict: 'secretaria_id,permission_key,school_id',
        });

      if (error) throw error;

      toast.success('Permissões atualizadas com sucesso');
      console.log('✅ [Permissions] Permissões salvas');

    } catch (err) {
      console.error('❌ [Permissions] Erro:', err);
      toast.error('Erro ao salvar permissões');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, currentSchool]);

  /**
   * Remover todas as permissões de uma secretária
   */
  const revokeSchoolAccess = useCallback(async (secretariaId: string) => {
    if (!user) {
      toast.error('Sessão inválida');
      return;
    }

    setLoading(true);
    try {
      console.log('🔒 [Permissions] Revogando acesso para:', secretariaId);

      const { error } = await supabase
        .from('secretaria_permissions')
        .delete()
        .eq('secretaria_id', secretariaId);

      if (error) throw error;

      toast.success('Permissões removidas com sucesso');
      console.log('✅ [Permissions] Permissões revogadas');

    } catch (err) {
      console.error('❌ [Permissions] Erro:', err);
      toast.error('Erro ao remover permissões');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Buscar permissões de uma secretária específica
   */
  const fetchSecretariaPermissions = useCallback(async (secretariaId: string) => {
    try {
      const { data, error } = await supabase
        .from('secretaria_permissions')
        .select('*')
        .eq('secretaria_id', secretariaId);

      if (error) throw error;

      return data || [];
    } catch (err) {
      console.error('❌ [Permissions] Erro ao buscar permissões:', err);
      return [];
    }
  }, []);

  return {
    grantSchoolAccess,
    revokeSchoolAccess,
    fetchSecretariaPermissions,
    loading,
  };
}
