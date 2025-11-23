import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Secretaria, SecretariaFormData, SecretariaFilters } from '@/types/secretaria';
import { logAudit } from '@/stores/audit-store';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';

export function useSecretarias() {
  const { currentSchool } = useSchool();
  const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SecretariaFilters>({
    search: '',
    status: 'all'
  });
  const { user } = useAuth();

  const loadSecretarias = async () => {
    if (!currentSchool) {
      setSecretarias([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: membershipData, error: membershipError } = await supabase
        .from('school_memberships')
        .select('user_id')
        .eq('school_id', currentSchool.id)
        .eq('role', 'secretaria');

      if (membershipError) throw membershipError;

      const userIds = membershipData?.map(m => m.user_id) || [];

      if (userIds.length === 0) {
        setSecretarias([]);
        setLoading(false);
        return;
      }

      // ✅ PASSO 2: Buscar perfis apenas dessas secretarias
      let query = supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status === 'active') {
        query = query.eq('is_active', true);
      } else if (filters.status === 'inactive') {
        query = query.eq('is_active', false);
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setSecretarias(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar secretarias:', error);
      toast.error('Erro ao carregar secretarias');
    } finally {
      setLoading(false);
    }
  };

  const createSecretaria = async (formData: SecretariaFormData): Promise<boolean> => {
    // ✅ Guard clause
    if (!currentSchool) {
      toast.error('Nenhuma escola selecionada');
      return false;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Você precisa estar autenticado');
        return false;
      }

      // ✅ PASSAR school_id para a edge function
      const response = await supabase.functions.invoke('create-demo-user', {
        body: {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: 'secretaria',
          school_id: currentSchool.id
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      // 🔍 DEBUG: Log completo da resposta
      console.log('🔍 Full response:', { 
        hasError: !!response.error, 
        hasData: !!response.data,
        data: response.data,
        error: response.error 
      });

      // ✅ PRIORIDADE 1: Verificar response.data primeiro (contém o body JSON mesmo com erro HTTP)
      if (response.data && !response.data.success && response.data.error) {
        console.error('✅ Edge function returned error in data:', response.data);
        throw new Error(response.data.error);
      }
      
      // ✅ PRIORIDADE 2: Verificar response.error como fallback
      if (response.error) {
        const errorData = response.error as any;
        const errorMessage = 
          errorData.message || 
          (typeof errorData === 'string' ? errorData : null) || 
          'Erro ao criar secretaria';
        
        console.error('❌ Edge function error object (fallback):', errorData);
        throw new Error(errorMessage);
      }

      // Update phone if provided
      if (formData.phone && response.data?.user?.id) {
        await supabase
          .from('profiles')
          .update({ phone: formData.phone })
          .eq('id', response.data.user.id);
      }

      // Audit log
      if (user && response.data?.user?.id) {
        await logAudit({
          action: 'CREATE',
          entity: 'USER',
          entity_id: response.data.user.id,
          entity_label: formData.name,
          actor_id: user.id,
          actor_name: user.name,
          actor_email: user.email,
          actor_role: user.role,
          scope: 'GLOBAL',
          meta: {
            role: 'secretaria',
            email: formData.email,
            school_id: currentSchool.id
          }
        });
      }

      toast.success('Secretaria criada com sucesso!');
      await loadSecretarias();
      return true;
    } catch (error: any) {
      console.error('Error creating secretaria:', error);
      // Não mostrar toast aqui - deixar o modal tratar
      // Re-lançar o erro para que o modal possa tratá-lo adequadamente
      throw error;
    }
  };

  const updateSecretaria = async (id: string, updates: Partial<SecretariaFormData>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: updates.name,
          phone: updates.phone
        })
        .eq('id', id);

      if (error) throw error;

      // Audit log
      if (user) {
        await logAudit({
          action: 'UPDATE',
          entity: 'USER',
          entity_id: id,
          entity_label: updates.name || 'Secretaria',
          actor_id: user.id,
          actor_name: user.name,
          actor_email: user.email,
          actor_role: user.role,
          scope: 'GLOBAL',
          meta: {
            role: 'secretaria',
            fields: Object.keys(updates)
          }
        });
      }

      toast.success('Secretaria atualizada com sucesso!');
      await loadSecretarias();
      return true;
    } catch (error: any) {
      console.error('Error updating secretaria:', error);
      toast.error('Erro ao atualizar secretaria');
      return false;
    }
  };

  const archiveSecretaria = async (id: string, name: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      // Audit log
      if (user) {
        await logAudit({
          action: 'ARCHIVE',
          entity: 'USER',
          entity_id: id,
          entity_label: name,
          actor_id: user.id,
          actor_name: user.name,
          actor_email: user.email,
          actor_role: user.role,
          scope: 'GLOBAL',
          meta: {
            role: 'secretaria'
          }
        });
      }

      toast.success('Secretaria arquivada com sucesso!');
      await loadSecretarias();
      return true;
    } catch (error: any) {
      console.error('Error archiving secretaria:', error);
      toast.error('Erro ao arquivar secretaria');
      return false;
    }
  };

  const reactivateSecretaria = async (id: string, name: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('id', id);

      if (error) throw error;

      // Audit log
      if (user) {
        await logAudit({
          action: 'UPDATE',
          entity: 'USER',
          entity_id: id,
          entity_label: name,
          actor_id: user.id,
          actor_name: user.name,
          actor_email: user.email,
          actor_role: user.role,
          scope: 'GLOBAL',
          meta: {
            role: 'secretaria',
            reactivated: true
          }
        });
      }

      toast.success('Secretaria reativada com sucesso!');
      await loadSecretarias();
      return true;
    } catch (error: any) {
      console.error('Error reactivating secretaria:', error);
      toast.error('Erro ao reativar secretaria');
      return false;
    }
  };

  const deleteSecretaria = async (id: string, name: string): Promise<boolean> => {
    try {
      // Buscar dados da secretária diretamente do banco
      const { data: secretariaToDelete, error: fetchError } = await supabase
        .from('profiles')
        .select('id, name, email, phone')
        .eq('id', id)
        .single();

      if (fetchError || !secretariaToDelete) {
        throw new Error('Secretária não encontrada no banco de dados');
      }

      // Registrar exclusão no histórico de auditoria
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

        await logAudit({
          action: 'DELETE',
          entity: 'USER',
          entity_id: id,
          entity_label: name,
          scope: 'GLOBAL',
          actor_id: user.id,
          actor_name: actorProfile?.name || user.email || 'Unknown',
          actor_email: actorProfile?.email || user.email || '',
          actor_role: actorRole?.role || 'unknown',
          meta: {
            role: 'secretaria',
            email: secretariaToDelete.email,
            phone: secretariaToDelete.phone
          }
        });
      }

      // Chamar edge function para deletar usuário
      const { error: functionError } = await supabase.functions.invoke('delete-user', {
        body: { userId: id }
      });

      if (functionError) {
        throw functionError;
      }

      // Deletar perfil (garantia, caso CASCADE não funcione)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (profileError) {
        console.warn(`Login deletado, mas erro ao limpar perfil: ${profileError.message}`);
      }

      toast.success('Secretária removida com sucesso');
      await loadSecretarias();
      return true;
    } catch (error: any) {
      console.error('Error deleting secretaria:', error);
      toast.error(`Erro ao remover secretária: ${error.message}`);
      return false;
    }
  };

  useEffect(() => {
    loadSecretarias();
  }, [filters, currentSchool?.id]);

  return {
    secretarias,
    loading,
    filters,
    setFilters,
    createSecretaria,
    updateSecretaria,
    archiveSecretaria,
    reactivateSecretaria,
    deleteSecretaria,
    reload: loadSecretarias
  };
}
