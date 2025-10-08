import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Teacher {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  phone?: string;
  class_id?: string;
  preferences?: any;
  must_change_password?: boolean;
  created_at: string;
  updated_at: string;
}

interface TeacherFilters {
  search?: string;
  status?: 'active' | 'archived' | 'all';
  class_id?: string;
  day?: string;
}

export function useTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeachers = useCallback(async (filters: TeacherFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      // Primeiro, buscar IDs de professores
      const { data: teacherRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'professor');

      if (rolesError) throw rolesError;

      const teacherIds = teacherRoles?.map(r => r.user_id) || [];
      
      if (teacherIds.length === 0) {
        setTeachers([]);
        setLoading(false);
        return;
      }

      // Depois, buscar profiles desses IDs
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', teacherIds);

      if (profilesError) throw profilesError;

      let data = profiles || [];

      // Apply search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        data = data.filter((teacher: any) =>
          teacher.name?.toLowerCase().includes(searchLower) ||
          teacher.email?.toLowerCase().includes(searchLower)
        );
      }

      // Apply class filter
      if (filters.class_id && filters.class_id !== 'all') {
        data = data.filter((teacher: any) => teacher.class_id === filters.class_id);
      }

      // Sort by name
      data.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

      // Add role field
      const teachersWithRole = data.map((teacher: any) => ({
        ...teacher,
        role: 'professor'
      }));

      setTeachers(teachersWithRole);
    } catch (err) {
      console.error('Error fetching teachers:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar professores');
      toast.error('Erro ao carregar professores');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTeacher = useCallback(async (teacherData: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
  }) => {
    setLoading(true);
    try {
      console.log('🔵 [useTeachers] Tentando criar professor:', teacherData);
      
      // Generate password if not provided
      const password = teacherData.password || `Prof${Math.floor(Math.random() * 10000)}!`;
      
      const { data, error } = await supabase.functions.invoke('create-demo-user', {
        body: {
          email: teacherData.email,
          password: password,
          name: teacherData.name,
          role: 'professor',
          phone: teacherData.phone,
        }
      });

      console.log('🔵 [useTeachers] Resposta da Edge Function:', { data, error });

      if (error) {
        console.error('🔴 [useTeachers] Erro na Edge Function:', error);
        throw error;
      }

      if (data && !data.success) {
        console.error('🔴 [useTeachers] Edge Function retornou erro:', data.error);
        throw new Error(data.error || 'Erro ao criar usuário');
      }

      console.log('✅ [useTeachers] Professor criado com sucesso');
      
      await fetchTeachers();
      
      // Return data with password for display
      return { ...data, password };
    } catch (err) {
      console.error('🔴 [useTeachers] Erro ao criar professor:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao criar professor');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTeachers]);

  const updateTeacher = useCallback(async (id: string, updates: Partial<Teacher> & { password?: string }) => {
    setLoading(true);
    try {
      // If password is being updated, use edge function
      if (updates.password) {
        const { data, error } = await supabase.functions.invoke('create-demo-user', {
          body: {
            userId: id,
            password: updates.password,
            updatePasswordOnly: true,
          }
        });

        if (error) throw error;
        if (data && !data.success) {
          throw new Error(data.error || 'Erro ao atualizar senha');
        }

        // Remove password from updates object before updating profile
        const { password, ...profileUpdates } = updates;
        
        if (Object.keys(profileUpdates).length > 0) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update(profileUpdates)
            .eq('id', id);

          if (profileError) throw profileError;
        }
      } else {
        // Regular profile update
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', id);

        if (error) throw error;
      }

      toast.success('Professor atualizado com sucesso');
      
      // Refresh the list
      await fetchTeachers();
    } catch (err) {
      console.error('Error updating teacher:', err);
      toast.error('Erro ao atualizar professor');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTeachers]);

  const deleteTeacher = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Professor removido com sucesso');
      
      // Refresh the list
      await fetchTeachers();
    } catch (err) {
      console.error('Error deleting teacher:', err);
      toast.error('Erro ao remover professor');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTeachers]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  return {
    teachers,
    loading,
    error,
    fetchTeachers,
    createTeacher,
    updateTeacher,
    deleteTeacher,
  };
}