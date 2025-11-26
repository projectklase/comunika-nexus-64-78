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
  authorizedSchoolNames?: string[]; // Lista de nomes de escolas autorizadas
  hasAllSchools?: boolean; // Indica se tem acesso a todas as escolas
}

interface UseAllPermissionsFilters {
  secretariaId?: string;
  schoolId?: string;
  search?: string;
}

export function useAllPermissions() {
  const { currentSchool } = useSchool();
  const [permissions, setPermissions] = useState<PermissionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UseAllPermissionsFilters>({});

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    console.log('[useAllPermissions] Iniciando busca de permissões...');
    try {
      // 1. Buscar permissões SEM joins automáticos (FK aponta para auth.users, não profiles)
      const { data: permissionsData, error: permError } = await supabase
        .from('secretaria_permissions')
        .select('id, secretaria_id, permission_key, permission_value, school_id, granted_at, granted_by')
        .order('granted_at', { ascending: false });

      if (permError) {
        console.error('[useAllPermissions] Erro ao buscar permissões:', permError);
        throw permError;
      }
      
      console.log('[useAllPermissions] Permissões carregadas:', permissionsData?.length || 0);

      if (!permissionsData?.length) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      // 2. Buscar profiles das secretárias (resolvendo manualmente)
      const secretariaIds = [...new Set(permissionsData.map(p => p.secretaria_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', secretariaIds);
      
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      console.log('[useAllPermissions] Profiles carregados:', profilesMap.size);

      // 3. Buscar nomes das escolas (resolvendo manualmente)
      const schoolIds = [...new Set(permissionsData.filter(p => p.school_id).map(p => p.school_id!))];
      const { data: schoolsData } = await supabase
        .from('schools')
        .select('id, name')
        .in('id', schoolIds);
      
      const schoolsMap = new Map(schoolsData?.map(s => [s.id, s]) || []);
      console.log('[useAllPermissions] Schools carregados:', schoolsMap.size);

      // 4. Transformar e combinar os dados
      const transformed = await Promise.all(permissionsData.map(async (row) => {
        const profile = profilesMap.get(row.secretaria_id);
        const school = row.school_id ? schoolsMap.get(row.school_id) : null;
        const permValue = row.permission_value as any;
        const schools = permValue?.schools || [];
        const hasAllSchools = schools === '*' || schools.includes('*');
        
        // Resolver nomes de escolas autorizadas
        let authorizedSchoolNames: string[] = [];
        if (!hasAllSchools && Array.isArray(schools) && schools.length > 0) {
          const { data: authSchools } = await supabase
            .from('schools')
            .select('name')
            .in('id', schools);
          authorizedSchoolNames = authSchools?.map(s => s.name) || [];
        }

        return {
          id: row.id,
          secretariaId: row.secretaria_id,
          secretariaName: profile?.name || 'Desconhecido',
          secretariaEmail: profile?.email || '',
          permissionKey: row.permission_key,
          permissionValue: row.permission_value,
          schoolId: row.school_id,
          schoolName: school?.name || 'Todas as Escolas',
          grantedAt: row.granted_at,
          grantedBy: row.granted_by,
          authorizedSchoolNames,
          hasAllSchools,
        };
      }));

      setPermissions(transformed);
      console.log('[useAllPermissions] Permissões transformadas com sucesso:', transformed.length);
    } catch (error: any) {
      console.error('[useAllPermissions] Erro ao buscar permissões:', error);
      toast.error('Falha ao carregar permissões');
    } finally {
      setLoading(false);
    }
  }, []);

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
