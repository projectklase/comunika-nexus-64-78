import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// As interfaces e a estrutura geral do hook permanecem as mesmas.
interface Guardian {
  id: string;
  name: string;
  relation: string;
  phone?: string;
  email?: string;
  is_primary: boolean;
}

interface StudentClass {
  id: string;
  name: string;
  code?: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  phone?: string;
  dob?: string;
  class_id?: string;
  preferences?: any;
  must_change_password?: boolean;
  created_at: string;
  updated_at: string;
  student_notes?: string;
  // Related data
  guardians?: Guardian[];
  classes?: StudentClass[];
  program_id?: string;
  program_name?: string;
  level_id?: string;
  level_name?: string;
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
      // Buscar profiles que são estudantes via JOIN com user_roles
      const { data: studentProfiles, error: studentsError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles!inner(*)
        `)
        .eq('role', 'aluno');

      if (studentsError) throw studentsError;

      // Extrair os profiles dos resultados
      const data = studentProfiles?.map((item: any) => item.profiles) || [];

      // Aplicar filtros client-side (search e class_id)
      let filteredData = data;

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter((student: any) =>
          student.name?.toLowerCase().includes(searchLower) ||
          student.email?.toLowerCase().includes(searchLower)
        );
      }

      if (filters.class_id && filters.class_id !== 'all') {
        const { data: classStudents } = await supabase
          .from('class_students')
          .select('student_id')
          .eq('class_id', filters.class_id);

        const studentIds = classStudents?.map((cs: any) => cs.student_id) || [];
        filteredData = filteredData.filter((student: any) => studentIds.includes(student.id));
      }

      // Enrich students with related data
      const enrichedStudents = await Promise.all(filteredData.map(async (student: any) => {
        // Parse student_notes to get program/level info
        let programId, levelId, programName, levelName;
        try {
          if (student.student_notes) {
            const notes = JSON.parse(student.student_notes);
            programId = notes.programId;
            levelId = notes.levelId;
          }
        } catch (e) {
          // Ignore parse errors
        }

        // Fetch program and level names if IDs exist
        if (programId) {
          const { data: programData } = await supabase
            .from('programs')
            .select('name')
            .eq('id', programId)
            .single();
          programName = programData?.name;
        }

        if (levelId) {
          const { data: levelData } = await supabase
            .from('levels')
            .select('name')
            .eq('id', levelId)
            .single();
          levelName = levelData?.name;
        }

        // Fetch guardians
        const { data: guardiansData } = await supabase
          .from('guardians')
          .select('*')
          .eq('student_id', student.id)
          .order('is_primary', { ascending: false });

        // Fetch classes
        const { data: classStudentsData } = await supabase
          .from('class_students')
          .select('class_id')
          .eq('student_id', student.id);

        const classIds = classStudentsData?.map(cs => cs.class_id) || [];
        let classes: StudentClass[] = [];

        if (classIds.length > 0) {
          const { data: classesData } = await supabase
            .from('classes')
            .select('id, name, code')
            .in('id', classIds);
          classes = classesData || [];
        }

        return {
          ...student,
          role: 'aluno', // Garantir que role existe
          guardians: guardiansData || [],
          classes: classes,
          program_id: programId,
          program_name: programName,
          level_id: levelId,
          level_name: levelName,
        };
      }));

      // Ordenar por nome
      enrichedStudents.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      setStudents(enrichedStudents);
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
    student_notes?: string;
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
          student_notes: studentData.student_notes,
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

  const updateStudent = useCallback(async (id: string, updates: Partial<Student> & { password?: string; student_notes?: string }) => {
    // A lógica de atualização de perfil está correta e será mantida.
    setLoading(true);
    try {
      // Se uma nova senha foi fornecida, atualiza via Edge Function para garantir segurança
      if (updates.password) {
        const { error: passwordError } = await supabase.functions.invoke('create-demo-user', {
          body: {
            userId: id,
            password: updates.password,
            updatePasswordOnly: true,
          }
        });
        
        if (passwordError) {
          console.error('Erro ao atualizar senha:', passwordError);
          throw new Error('Erro ao atualizar senha do aluno');
        }
      }

      // Atualiza o perfil (remove password do objeto updates antes de salvar no perfil)
      const { password, ...profileUpdates } = updates;
      
      const { error } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', id);

      if (error) throw error;
      toast.success(password ? 'Aluno e senha atualizados com sucesso' : 'Aluno atualizado com sucesso');
      await fetchStudents();
      
      // Retorna a senha se foi atualizada
      return password ? { password } : undefined;
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