import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// As interfaces e a estrutura geral do hook permanecem as mesmas.
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

      // A lógica de filtros existente está correta e será mantida.
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

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
    dob?: string;
    phone?: string;
    enrollment_number?: string;
  }) => {
    setLoading(true);
    try {
      // Generate password if not provided
      const password = studentData.password || `Aluno${Math.floor(Math.random() * 10000)}!`;
      
      const { data, error } = await supabase.functions.invoke('create-demo-user', {
        body: {
          email: studentData.email,
          password: password,
          name: studentData.name,
          role: 'aluno',
          dob: studentData.dob,
          phone: studentData.phone,
          enrollment_number: studentData.enrollment_number,
        }
      });

      if (error) throw error;
      if (data && !data.success) {
        throw new Error(data.error || 'Erro ao criar usuário');
      }

      // Return data with the password for display
      await fetchStudents();
      return { ...data, password };
    } catch (err) {
      console.error('Error creating student:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao criar aluno');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchStudents]);

  const updateStudent = useCallback(async (id: string, updates: Partial<Student>) => {
    // A lógica de atualização de perfil está correta e será mantida.
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Aluno atualizado com sucesso');
      await fetchStudents();
    } catch (err) {
      console.error('Error updating student:', err);
      toast.error('Erro ao atualizar aluno');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchStudents]);

  // --- CORREÇÃO APLICADA AQUI ---
  /**
   * Deleta um aluno tanto do sistema de autenticação quanto do perfil.
   * É uma operação de duas etapas que precisa ser feita por um administrador.
   */
  const deleteStudent = useCallback(async (id: string) => {
    setLoading(true);
    try {
      // Passo 1: Chamar uma Edge Function segura para deletar o usuário do sistema de autenticação (auth.users).
      // Isso é necessário porque a exclusão de usuários exige privilégios de administrador.
      const { error: functionError } = await supabase.functions.invoke('delete-user', {
        body: { userId: id }
      });

      if (functionError) {
        // Se a função não existir, tentamos o método legado, mas idealmente a função é o caminho certo.
        if (functionError.message.includes('Function not found')) {
            console.warn("Edge Function 'delete-user' não encontrada. A exclusão pode ser incompleta.");
            // Tentar deletar apenas o perfil como um fallback pode deixar "usuários fantasmas".
            // A melhor prática é garantir que a Edge Function exista.
            throw new Error("A função de servidor para deletar usuários não foi encontrada.");
        }
        throw functionError;
      }
      
      // Se a Edge Function funcionou, o registro em `public.profiles` deve ser apagado
      // automaticamente pela configuração "ON DELETE CASCADE" que definimos na tabela `profiles`.
      // A chamada abaixo é uma garantia extra caso o CASCADE não funcione.
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (profileError) {
         // Loga um aviso, mas considera a operação um sucesso se o usuário de autenticação foi removido.
        console.warn(`Login do aluno deletado, mas ocorreu um erro ao limpar o perfil: ${profileError.message}`);
      }

      toast.success('Aluno removido com sucesso');
      
      // Passo 2: Atualizar a lista na tela para refletir a remoção.
      await fetchStudents();

    } catch (err: any) {
      console.error('Error deleting student:', err);
      toast.error(`Erro ao remover aluno: ${err.message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchStudents]);
  // --- FIM DA CORREÇÃO ---

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