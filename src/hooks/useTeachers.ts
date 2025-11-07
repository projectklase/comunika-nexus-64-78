import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSchool } from '@/contexts/SchoolContext';

interface Teacher {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  phone?: string;
  class_id?: string;
  preferences?: {
    ui?: any;
    notifications?: any;
    teacher?: any; // Dados extras do professor
  };
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
  const { currentSchool } = useSchool();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeachers = useCallback(async (filters: TeacherFilters = {}) => {
    // ✅ Guard clause - não carregar sem escola
    if (!currentSchool) {
      console.log('🏫 [useTeachers] Nenhuma escola selecionada, lista vazia');
      setTeachers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🏫 [useTeachers] Buscando professores da escola:', currentSchool.name, currentSchool.id);

      // ✅ NOVO: Buscar professores vinculados à escola via school_memberships
      const { data: schoolMemberships, error: membershipsError } = await supabase
        .from('school_memberships')
        .select('user_id')
        .eq('school_id', currentSchool.id)
        .eq('role', 'professor');

      if (membershipsError) throw membershipsError;

      const teacherIds = schoolMemberships?.map(m => m.user_id) || [];
      
      console.log('👨‍🏫 [useTeachers] Professores encontrados na escola:', teacherIds.length);
      
      if (teacherIds.length === 0) {
        setTeachers([]);
        setLoading(false);
        return;
      }

      // Buscar profiles apenas dos professores vinculados à escola
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
  }, [currentSchool]);

  const createTeacher = useCallback(async (teacherData: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
  }) => {
    // ✅ Guard clause
    if (!currentSchool) {
      toast.error('Nenhuma escola selecionada');
      throw new Error('Nenhuma escola selecionada');
    }

    setLoading(true);
    try {
      console.log('🔵 [useTeachers] Tentando criar professor na escola:', currentSchool.name);
      console.log('🔵 [useTeachers] Dados do professor:', teacherData);
      
      // Generate password if not provided
      const password = teacherData.password || `Prof${Math.floor(Math.random() * 10000)}!`;
      
      // ✅ NOVO: Passar school_id para a Edge Function
      const { data, error } = await supabase.functions.invoke('create-demo-user', {
        body: {
          email: teacherData.email,
          password: password,
          name: teacherData.name,
          role: 'professor',
          phone: teacherData.phone,
          school_id: currentSchool.id, // ← CRÍTICO: vincular à escola
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
      
      // CORREÇÃO 4: Melhor feedback para o usuário
      toast.success(
        'Professor criado com sucesso! Aguarde 5 segundos antes de fazer login.',
        { duration: 5000 }
      );
      
      // Aguardar 5 segundos para garantir que triggers foram executados
      await new Promise(resolve => setTimeout(resolve, 5000));
      
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
  }, [fetchTeachers, currentSchool]);

  const updateTeacher = useCallback(async (id: string, updates: Partial<Teacher> & { password?: string }) => {
    setLoading(true);
    try {
      console.log('💾 [useTeachers] Recebendo updates:', updates);
      console.log('💾 [useTeachers] Campo preferences:', updates.preferences);
      
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

  // ✅ Recarregar quando escola mudar
  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers, currentSchool?.id]);

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