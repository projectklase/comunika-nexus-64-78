import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { toast } from 'sonner';

export interface PermissionWithDetails {
  id: string;
  secretariaId: string;
  secretariaName: string;
  secretariaEmail: string;
  permissionKey: string;
  permissionValue: any;
  schoolId: string | null;
  schoolName: string | null;
  grantedAt: string;
  grantedBy: string | null;
}

interface UseAllPermissionsFilters {
  secretariaId?: string;
  schoolId?: string;
  search?: string;
}

export function useAllPermissions() {
  const { currentSchool } = useSchool();
  const [permissions, setPermissions] = useState<PermissionWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<UseAllPermissionsFilters>({});

  const fetchPermissions = useCallback(async () => {
    if (!currentSchool?.id) return;

    setLoading(true);
    try {
      // Buscar permissões com join em profiles e schools
      let query = supabase
        .from('secretaria_permissions')
        .select(`
          id,
          secretaria_id,
          permission_key,
          permission_value,
          school_id,
          granted_at,
          granted_by,
          profiles!secretaria_permissions_secretaria_id_fkey (
            name,
            email
          ),
          schools (
            name
          )
        `)
        .order('granted_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Transformar dados
      const transformed: PermissionWithDetails[] = (data || []).map((row: any) => ({
        id: row.id,
        secretariaId: row.secretaria_id,
        secretariaName: row.profiles?.name || 'Desconhecido',
        secretariaEmail: row.profiles?.email || '',
        permissionKey: row.permission_key,
        permissionValue: row.permission_value,
        schoolId: row.school_id,
        schoolName: row.schools?.name || 'Todas as Escolas',
        grantedAt: row.granted_at,
        grantedBy: row.granted_by,
      }));

      setPermissions(transformed);
    } catch (error: any) {
      console.error('Erro ao buscar permissões:', error);
      toast.error('Falha ao carregar permissões');
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Filtrar permissões localmente
  const filteredPermissions = permissions.filter((perm) => {
    if (filters.secretariaId && perm.secretariaId !== filters.secretariaId) {
      return false;
    }

    if (filters.schoolId && perm.schoolId !== filters.schoolId) {
      return false;
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        perm.secretariaName.toLowerCase().includes(searchLower) ||
        perm.secretariaEmail.toLowerCase().includes(searchLower) ||
        (perm.schoolName && perm.schoolName.toLowerCase().includes(searchLower))
      );
    }

    return true;
  });

  // Estatísticas
  const stats = {
    totalSecretariasWithPermissions: new Set(permissions.map(p => p.secretariaId)).size,
    totalSchoolsShared: new Set(permissions.filter(p => p.schoolId).map(p => p.schoolId)).size,
    totalGrants: permissions.length,
  };

  return {
    permissions: filteredPermissions,
    allPermissions: permissions,
    loading,
    filters,
    setFilters,
    stats,
    refetch: fetchPermissions,
  };
}
