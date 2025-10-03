import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Student {
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

interface StudentFilters {
  search?: string;
  status?: 'active' | 'archived' | 'all';
  class_id?: string;
  program_id?: string;
  level_id?: string;
}

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async (filters: StudentFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'aluno')
        .eq('is_active', true);

      // Apply search filter
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      // Apply class filter via join
      if (filters.class_id && filters.class_id !== 'all') {
        const { data: classStudents } = await (supabase as any)
          .from('class_students')
          .select('student_id')
          .eq('class_id', filters.class_id);

        const studentIds = classStudents?.map((cs: any) => cs.student_id) || [];
        if (studentIds.length > 0) {
          query = query.in('id', studentIds);
        } else {
          setStudents([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query.order('name');

      if (error) throw error;

      setStudents(data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar alunos');
      toast.error('Erro ao carregar alunos');
    } finally {
      setLoading(false);
    }
  }, []);

  const createStudent = useCallback(async (studentData: {
    name: string;
    email: string;
    password?: string;
  }) => {
    setLoading(true);
    try {
      // Use Edge Function to create student
      const { data, error } = await supabase.functions.invoke('create-demo-user', {
        body: {
          email: studentData.email,
          password: studentData.password || '123456',
          name: studentData.name,
          role: 'aluno',
        }
      });

      if (error) throw error;

      if (data && !data.success) {
        throw new Error(data.error || 'Erro ao criar usuário');
      }

      toast.success('Aluno criado com sucesso');
      
      // Refresh the list
      await fetchStudents();
      
      return data;
    } catch (err) {
      console.error('Error creating student:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao criar aluno');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchStudents]);

  const updateStudent = useCallback(async (id: string, updates: Partial<Student>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast.success('Aluno atualizado com sucesso');
      
      // Refresh the list
      await fetchStudents();
    } catch (err) {
      console.error('Error updating student:', err);
      toast.error('Erro ao atualizar aluno');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchStudents]);

  const deleteStudent = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Aluno removido com sucesso');
      
      // Refresh the list
      await fetchStudents();
    } catch (err) {
      console.error('Error deleting student:', err);
      toast.error('Erro ao remover aluno');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchStudents]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return {
    students,
    loading,
    error,
    fetchStudents,
    createStudent,
    updateStudent,
    deleteStudent,
  };
}