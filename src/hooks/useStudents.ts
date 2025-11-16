import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSchool } from '@/contexts/SchoolContext';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/stores/audit-store';

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
  const { currentSchool } = useSchool();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async (filters: StudentFilters = {}) => {
    if (!currentSchool) {
      console.log('[useStudents] No current school, skipping fetch');
      setStudents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: membershipData, error: membershipError } = await supabase
        .from('school_memberships')
        .select('user_id')
        .eq('school_id', currentSchool.id)
        .eq('role', 'aluno');

      if (membershipError) throw membershipError;

      const studentIds = membershipData?.map(m => m.user_id) || [];

      if (studentIds.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Buscar perfis desses alunos
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', studentIds);

      if (profilesError) throw profilesError;

      let filteredData = profiles || [];

      // Aplicar filtros client-side (search)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter((student: any) =>
          student.name?.toLowerCase().includes(searchLower) ||
          student.email?.toLowerCase().includes(searchLower)
        );
      }

      // Filtrar por turma se especificado
      if (filters.class_id && filters.class_id !== 'all') {
        // Buscar turmas DA ESCOLA para garantir segurança
        const { data: schoolClasses } = await supabase
          .from('classes')
          .select('id')
          .eq('school_id', currentSchool.id);

        const schoolClassIds = schoolClasses?.map(c => c.id) || [];

        const { data: filteredClassStudents } = await supabase
          .from('class_students')
          .select('student_id')
          .eq('class_id', filters.class_id)
          .in('class_id', schoolClassIds);

        const filteredStudentIds = filteredClassStudents?.map((cs: any) => cs.student_id) || [];
        filteredData = filteredData.filter((student: any) => filteredStudentIds.includes(student.id));
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

        // Fetch classes - buscar turmas DA ESCOLA primeiro para garantir segurança
        const { data: schoolClasses } = await supabase
          .from('classes')
          .select('id')
          .eq('school_id', currentSchool.id);

        const schoolClassIds = schoolClasses?.map(c => c.id) || [];

        const { data: classStudentsData } = await supabase
          .from('class_students')
          .select('class_id')
          .eq('student_id', student.id)
          .in('class_id', schoolClassIds);

        const studentClassIds = classStudentsData?.map(cs => cs.class_id) || [];
        let classes: StudentClass[] = [];

        if (studentClassIds.length > 0) {
          const { data: classesData } = await supabase
            .from('classes')
            .select('id, name, code')
            .in('id', studentClassIds);
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
  }, [currentSchool?.id]);

  const createStudent = useCallback(async (studentData: {
    name: string;
    email: string;
    password?: string;
    dob?: string;
    phone?: string;
    enrollment_number?: string;
    student_notes?: string;
  }) => {
    // ✅ Guard clause
    if (!currentSchool) {
      toast.error('Nenhuma escola selecionada');
      throw new Error('Escola não selecionada');
    }

    setLoading(true);
    try {
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
          school_id: currentSchool.id
        }
      });

      if (error) throw error;
      if (data && !data.success) {
        throw new Error(data.error || 'Erro ao criar usuário');
      }

      // CORREÇÃO 4: Melhor feedback para o usuário
      toast.success(
        'Aluno criado com sucesso! Aguarde 5 segundos antes de fazer login.',
        { duration: 5000 }
      );
      
      // Aguardar 5 segundos para garantir que triggers foram executados
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await fetchStudents();
      return { ...data, password };
    } catch (err) {
      console.error('Error creating student:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao criar aluno');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchStudents, currentSchool?.id]);

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
      // Buscar dados do aluno antes de deletar para registrar no audit log
      const studentToDelete = students.find(s => s.id === id);
      
      if (!studentToDelete) {
        throw new Error('Aluno não encontrado');
      }

      // Buscar turmas do aluno
      const { data: studentClasses } = await supabase
        .from('class_students')
        .select('class_id')
        .eq('student_id', id);

      const classIds = studentClasses?.map(sc => sc.class_id) || [];

      // Buscar dados do usuário logado para o audit log
      if (user && currentSchool) {
        const { data: actorProfile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', user.id)
          .single();

        const { data: actorRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        // Registrar exclusão no histórico de auditoria
        await logAudit({
          action: 'DELETE',
          entity: 'STUDENT',
          entity_id: id,
          entity_label: studentToDelete.name,
          scope: 'GLOBAL',
          actor_id: user.id,
          actor_name: actorProfile?.name || user.email || 'Unknown',
          actor_email: actorProfile?.email || user.email || '',
          actor_role: actorRole?.role || 'unknown',
          meta: {
            email: studentToDelete.email,
            classes: classIds,
          }
        });
      }

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