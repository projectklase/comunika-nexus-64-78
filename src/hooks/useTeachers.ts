import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSchool } from '@/contexts/SchoolContext';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/stores/audit-store';

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
  const { user } = useAuth();
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
    schoolIds?: string[]; // NOVO: Array de escolas onde professor atua
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
      
      // Obter sessão para token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada');

      // Fetch manual com controle total sobre erro 409
      const response = await fetch(
        `https://yanspolqarficibgovia.supabase.co/functions/v1/create-demo-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhbnNwb2xxYXJmaWNpYmdvdmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NTczMjUsImV4cCI6MjA3NDQzMzMyNX0.QMU9Bxjl9NzyrSgUKeHE0HgcSsBUeFQefjQIoEczRYM'
          },
          body: JSON.stringify({
            email: teacherData.email,
            password: password,
            name: teacherData.name,
            role: 'professor',
            phone: teacherData.phone,
            school_id: currentSchool.id
          })
        }
      );

      const responseData = await response.json();

      console.log('🔵 [useTeachers] Resposta da Edge Function:', { responseData, status: response.status });

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.error || 'Erro ao criar professor');
      }

      console.log('✅ [useTeachers] Professor criado com sucesso');

      // ✅ NOVO: Se professor atua em múltiplas escolas, criar memberships adicionais
      if (teacherData.schoolIds && teacherData.schoolIds.length > 1) {
        console.log('🏫 [useTeachers] Criando memberships em múltiplas escolas:', teacherData.schoolIds);
        
        const userId = responseData.user_id;
        
        // Criar membership em cada escola adicional (primeira já foi criada pela edge function)
        const additionalSchools = teacherData.schoolIds.filter(id => id !== currentSchool.id);
        
        for (const schoolId of additionalSchools) {
          await supabase
            .from('school_memberships')
            .insert({
              user_id: userId,
              school_id: schoolId,
              role: 'professor',
              is_primary: false, // Apenas a primeira é primary
            });
        }
        
        console.log('✅ [useTeachers] Memberships criados em', additionalSchools.length, 'escolas adicionais');
      }
      
      // CORREÇÃO 4: Melhor feedback para o usuário
      toast.success(
        'Professor criado com sucesso! Aguarde 5 segundos antes de fazer login.',
        { duration: 5000 }
      );
      
      // Aguardar 5 segundos para garantir que triggers foram executados
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await fetchTeachers();
      
      // Return data with password for display
      return { ...responseData, password };
    } catch (err) {
      console.error('🔴 [useTeachers] Erro ao criar professor:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao criar professor');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTeachers, currentSchool]);

  const updateTeacher = useCallback(async (id: string, updates: Partial<Teacher> & { password?: string; schoolIds?: string[] }) => {
    setLoading(true);
    try {
      console.log('💾 [useTeachers] Recebendo updates:', updates);
      console.log('💾 [useTeachers] Campo preferences:', updates.preferences);
      
      // ✅ Buscar dados do ator para audit log
      const { data: { user } } = await supabase.auth.getUser();
      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user?.id)
        .single();

      const { data: actorRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .single();
      
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
        const { password, schoolIds, ...profileUpdates } = updates;
        
        if (Object.keys(profileUpdates).length > 0) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update(profileUpdates)
            .eq('id', id);

          if (profileError) throw profileError;
        }
      } else {
        // Regular profile update
        const { schoolIds, ...profileUpdates } = updates;
        const { error } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', id);

        if (error) throw error;
      }

      // ✅ NOVO: Sincronizar school_memberships se schoolIds foi fornecido
      if (updates.schoolIds) {
        console.log('🏫 [useTeachers] Sincronizando memberships:', updates.schoolIds);
        
        // 1. Buscar memberships atuais
        const { data: currentMemberships } = await supabase
          .from('school_memberships')
          .select('school_id, is_primary')
          .eq('user_id', id)
          .eq('role', 'professor');
        
        const currentSchoolIds = currentMemberships?.map(m => m.school_id) || [];
        const primarySchoolId = currentMemberships?.find(m => m.is_primary)?.school_id;
        
        // 2. Adicionar novas escolas
        const schoolsToAdd = updates.schoolIds.filter(schoolId => !currentSchoolIds.includes(schoolId));
        for (const schoolId of schoolsToAdd) {
          const { error: insertError } = await supabase.from('school_memberships').insert({
            user_id: id,
            school_id: schoolId,
            role: 'professor',
            is_primary: false
          });
          
          if (insertError) {
            console.error('❌ [useTeachers] Erro ao adicionar membership:', insertError);
            throw new Error(`Sem permissão para adicionar escola. Contate o administrador. (${insertError.message})`);
          }
          
          console.log('✅ [useTeachers] Adicionado membership:', schoolId);

          // ✅ Registrar adição no histórico de auditoria
          const { data: schoolData } = await supabase
            .from('schools')
            .select('name')
            .eq('id', schoolId)
            .single();

          await logAudit({
            action: 'ASSIGN',
            entity: 'TEACHER',
            entity_id: id,
            entity_label: `${updates.name || 'Professor'} adicionado a ${schoolData?.name || 'Nova Escola'}`,
            actor_id: user?.id,
            actor_name: actorProfile?.name || user?.email || 'Usuário Desconhecido',
            actor_email: actorProfile?.email || user?.email || '',
            actor_role: actorRole?.role || 'unknown',
            school_id: currentSchool?.id,
            meta: {
              operation: 'ADD_SCHOOL_ACCESS',
              added_school_id: schoolId,
              added_school_name: schoolData?.name || 'Desconhecida'
            }
          });
        }
        
        // 3. Remover escolas desmarcadas (exceto a primária)
        const schoolsToRemove = currentSchoolIds.filter(schoolId => 
          !updates.schoolIds!.includes(schoolId) && schoolId !== primarySchoolId
        );
        
        // Log de auditoria para cada escola removida
        for (const schoolId of schoolsToRemove) {
          // Buscar dados da escola para log
          const { data: schoolData } = await supabase
            .from('schools')
            .select('name')
            .eq('id', schoolId)
            .single();

          // Buscar turmas afetadas para incluir no log
          const { data: affectedClasses } = await supabase
            .from('classes')
            .select('id, name')
            .eq('main_teacher_id', id)
            .eq('school_id', schoolId)
            .eq('status', 'Ativa');

          // ✅ CRÍTICO: Limpar main_teacher_id das turmas ANTES de remover membership
          if (affectedClasses && affectedClasses.length > 0) {
            const classIds = affectedClasses.map(c => c.id);
            const { error: updateError } = await supabase
              .from('classes')
              .update({ main_teacher_id: null })
              .in('id', classIds);
            
            if (updateError) {
              console.error('❌ [useTeachers] Erro ao limpar main_teacher_id:', updateError);
            } else {
              console.log('🧹 [useTeachers] Limpou main_teacher_id de', classIds.length, 'turmas');
            }
          }

          const { error: deleteError } = await supabase.from('school_memberships')
            .delete()
            .eq('user_id', id)
            .eq('school_id', schoolId)
            .eq('role', 'professor');
          
          if (deleteError) {
            console.error('❌ [useTeachers] Erro ao remover membership:', deleteError);
            throw new Error(`Sem permissão para remover escola. Contate o administrador. (${deleteError.message})`);
          }
          
          console.log('🗑️ [useTeachers] Removido membership:', schoolId);

          // Registrar remoção no histórico de auditoria COM DADOS COMPLETOS DO ATOR
          await logAudit({
            action: 'UPDATE', // ✅ Mudado de DELETE para UPDATE (remoção de acesso, não exclusão)
            entity: 'TEACHER',
            entity_id: id,
            entity_label: `${updates.name || 'Professor'} removido de ${schoolData?.name || 'escola desconhecida'}`,
            actor_id: user?.id,
            actor_name: actorProfile?.name || user?.email || 'Usuário Desconhecido',
            actor_email: actorProfile?.email || user?.email || '',
            actor_role: actorRole?.role || 'unknown',
            school_id: currentSchool?.id, // ✅ Usar escola ATUAL para aparecer no histórico correto
            meta: {
              operation: 'REMOVE_SCHOOL_ACCESS',
              removed_school_id: schoolId,
              removed_school_name: schoolData?.name || 'Desconhecida',
              affected_classes: affectedClasses?.map(c => ({ id: c.id, name: c.name })) || [],
              affected_classes_count: affectedClasses?.length || 0
            }
          });
        }
        
        console.log('✅ [useTeachers] Sincronização de memberships completa');
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

  /**
   * Deleta um professor tanto do sistema de autenticação quanto do perfil.
   * Usa a Edge Function 'delete-user' que possui privilégios administrativos.
   * É uma operação de duas etapas que precisa ser feita por um administrador.
   */
  const deleteTeacher = useCallback(async (id: string) => {
    setLoading(true);
    try {
      // Buscar dados do professor antes de deletar para registrar no audit log
      const teacherToDelete = teachers.find(t => t.id === id);
      
      if (!teacherToDelete) {
        throw new Error('Professor não encontrado');
      }

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
          entity: 'TEACHER',
          entity_id: id,
          entity_label: teacherToDelete.name,
          scope: 'GLOBAL',
          actor_id: user.id,
          actor_name: actorProfile?.name || user.email || 'Unknown',
          actor_email: actorProfile?.email || user.email || '',
          actor_role: actorRole?.role || 'unknown',
          school_id: currentSchool.id,
          meta: {
            email: teacherToDelete.email,
            phone: teacherToDelete.phone,
          }
        });
      }

      // Passo 1: Chamar Edge Function segura para deletar o usuário do sistema de autenticação (auth.users).
      // Isso é necessário porque a exclusão de usuários exige privilégios de administrador.
      const { error: functionError } = await supabase.functions.invoke('delete-user', {
        body: { userId: id }
      });

      if (functionError) {
        // Se a função não existir, retornar erro apropriado
        if (functionError.message.includes('Function not found')) {
            console.warn("Edge Function 'delete-user' não encontrada. A exclusão pode ser incompleta.");
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
        console.warn(`Login do professor deletado, mas ocorreu um erro ao limpar o perfil: ${profileError.message}`);
      }

      toast.success('Professor removido com sucesso');
      
      // Passo 2: Atualizar a lista na tela para refletir a remoção.
      await fetchTeachers();

    } catch (err: any) {
      console.error('Error deleting teacher:', err);
      toast.error(`Erro ao remover professor: ${err.message}`);
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