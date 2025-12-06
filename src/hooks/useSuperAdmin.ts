import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface PlatformMetrics {
  total_schools: number;
  active_schools: number;
  total_users: number;
  total_admins: number;
  total_teachers: number;
  total_secretarias: number;
  total_students: number;
  total_subscriptions: number;
  active_subscriptions: number;
  logins_today: number;
  logins_this_week: number;
  generated_at: string;
}

interface PlatformAuditLog {
  id: string;
  superadmin_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

export function useSuperAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if current user is superadmin
  const { data: isSuperAdmin, isLoading: checkingStatus } = useQuery({
    queryKey: ['is-superadmin', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase.rpc('is_superadmin', { _user_id: user.id });
      if (error) throw error;
      return data === true;
    },
    enabled: !!user,
  });

  // Get platform metrics
  const { data: metrics, isLoading: loadingMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['platform-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_platform_metrics');
      if (error) throw error;
      return data as unknown as PlatformMetrics;
    },
    enabled: isSuperAdmin === true,
    refetchInterval: 60000, // Refresh every minute
  });

  // Get all schools with subscription info
  const { data: schools, isLoading: loadingSchools, refetch: refetchSchools } = useQuery({
    queryKey: ['platform-schools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select(`
          *,
          admin_subscriptions (
            id,
            status,
            plan_id,
            started_at,
            expires_at,
            trial_ends_at,
            addon_schools_count,
            subscription_plans (
              name,
              slug,
              price_cents,
              max_students,
              included_schools
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin === true,
  });

  // Get platform audit logs
  const { data: auditLogs, isLoading: loadingAuditLogs } = useQuery({
    queryKey: ['platform-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as PlatformAuditLog[];
    },
    enabled: isSuperAdmin === true,
  });

  // Log superadmin action
  const logAction = useMutation({
    mutationFn: async (params: {
      action: string;
      entityType: string;
      entityId?: string;
      entityLabel?: string;
      details?: Record<string, any>;
    }) => {
      const { data, error } = await supabase.rpc('log_superadmin_action', {
        p_action: params.action,
        p_entity_type: params.entityType,
        p_entity_id: params.entityId || null,
        p_entity_label: params.entityLabel || null,
        p_details: params.details || null,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-audit-logs'] });
    },
  });

  return {
    isSuperAdmin,
    checkingStatus,
    metrics,
    loadingMetrics,
    refetchMetrics,
    schools,
    loadingSchools,
    refetchSchools,
    auditLogs,
    loadingAuditLogs,
    logAction,
  };
}
