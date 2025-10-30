import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Secretaria, SecretariaFormData, SecretariaFilters } from '@/types/secretaria';
import { logAudit } from '@/stores/audit-store';
import { useAuth } from '@/contexts/AuthContext';

export function useSecretarias() {
  const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SecretariaFilters>({
    search: '',
    status: 'all'
  });
  const { user } = useAuth();

  const loadSecretarias = async () => {
    try {
      setLoading(true);

      // Get all users with 'secretaria' role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'secretaria');

      if (roleError) throw roleError;

      const userIds = roleData.map(r => r.user_id);

      if (userIds.length === 0) {
        setSecretarias([]);
        return;
      }

      // Get profiles for these users
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
      console.error('Error loading secretarias:', error);
      toast.error('Erro ao carregar secretarias');
    } finally {
      setLoading(false);
    }
  };

  const createSecretaria = async (formData: SecretariaFormData): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Você precisa estar autenticado');
        return false;
      }

      const response = await supabase.functions.invoke('create-demo-user', {
        body: {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: 'secretaria'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
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
            email: formData.email
          }
        });
      }

      toast.success('Secretaria criada com sucesso!');
      await loadSecretarias();
      return true;
    } catch (error: any) {
      console.error('Error creating secretaria:', error);
      toast.error(error.message || 'Erro ao criar secretaria');
      return false;
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

  useEffect(() => {
    loadSecretarias();
  }, [filters]);

  return {
    secretarias,
    loading,
    filters,
    setFilters,
    createSecretaria,
    updateSecretaria,
    archiveSecretaria,
    reactivateSecretaria,
    reload: loadSecretarias
  };
}
