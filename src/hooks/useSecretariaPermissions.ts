import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface SecretariaPermission {
  id: string;
  secretaria_id: string;
  permission_key: string;
  permission_value: any; // JSONB field - tipagem flexível
  granted_by?: string;
  granted_at: string;
  school_id?: string;
}

interface UseSecretariaPermissionsReturn {
  permissions: SecretariaPermission[];
  loading: boolean;
  hasPermission: (key: string) => boolean;
  getPermissionValue: (key: string) => any;
  grantPermission: (
    secretariaId: string,
    key: string,
    value: any,
    schoolId?: string
  ) => Promise<boolean>;
  revokePermission: (secretariaId: string, key: string) => Promise<boolean>;
  reload: () => Promise<void>;
}

/**
 * Hook para gerenciar permissões extras de secretárias
 * Permite que administradores concedam permissões granulares
 */
export function useSecretariaPermissions(
  secretariaId?: string
): UseSecretariaPermissionsReturn {
  const { toast } = useToast();
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<SecretariaPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!secretariaId) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('secretaria_permissions')
        .select('*')
        .eq('secretaria_id', secretariaId)
        .order('granted_at', { ascending: false });

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Error fetching secretaria permissions:', error);
      toast({
        title: 'Erro ao carregar permissões',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [secretariaId, toast]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (key: string): boolean => {
      return permissions.some((p) => p.permission_key === key);
    },
    [permissions]
  );

  const getPermissionValue = useCallback(
    (key: string): any => {
      const permission = permissions.find((p) => p.permission_key === key);
      return permission?.permission_value || null;
    },
    [permissions]
  );

  const grantPermission = async (
    secretariaId: string,
    key: string,
    value: any,
    schoolId?: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase.from('secretaria_permissions').upsert(
        {
          secretaria_id: secretariaId,
          permission_key: key,
          permission_value: value,
          granted_by: user?.id,
          school_id: schoolId || null,
        },
        {
          onConflict: 'secretaria_id,permission_key,school_id',
        }
      );

      if (error) throw error;

      toast({
        title: 'Permissão concedida',
        description: 'A permissão foi atualizada com sucesso.',
      });

      await fetchPermissions();
      return true;
    } catch (error) {
      console.error('Error granting permission:', error);
      toast({
        title: 'Erro ao conceder permissão',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return false;
    }
  };

  const revokePermission = async (
    secretariaId: string,
    key: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('secretaria_permissions')
        .delete()
        .eq('secretaria_id', secretariaId)
        .eq('permission_key', key);

      if (error) throw error;

      toast({
        title: 'Permissão revogada',
        description: 'A permissão foi removida com sucesso.',
      });

      await fetchPermissions();
      return true;
    } catch (error) {
      console.error('Error revoking permission:', error);
      toast({
        title: 'Erro ao revogar permissão',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    permissions,
    loading,
    hasPermission,
    getPermissionValue,
    grantPermission,
    revokePermission,
    reload: fetchPermissions,
  };
}
