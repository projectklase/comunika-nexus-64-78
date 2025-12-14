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
  mrr_cents: number;
  mrr_growth_pct: number;
  arpu_cents: number;
  logins_today: number;
  logins_this_week: number;
  generated_at: string;
}

interface SchoolOverview {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  logo_url: string | null;
  primary_color: string | null;
  created_at: string;
  total_users: number;
  total_students: number;
  total_teachers: number;
  admin_id: string | null;
  admin_name: string | null;
  admin_email: string | null;
  school_order: number;
  is_addon_school: boolean;
  subscription: {
    id: string;
    status: string;
    plan_name: string;
    plan_slug: string;
    price_cents: number;
    addon_school_price_cents: number;
    max_students: number;
    included_schools: number;
    addon_schools: number;
    started_at: string;
    expires_at: string | null;
    trial_ends_at: string | null;
  } | null;
}

interface AdminOverview {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  created_at: string;
  is_active: boolean;
  schools_count: number;
  total_students: number;
  is_test_account?: boolean;
  subscription: {
    id: string;
    status: string;
    plan_name: string;
    plan_slug: string;
    price_cents: number;
    max_students: number;
    included_schools: number;
    addon_schools: number;
    started_at: string;
    expires_at: string | null;
    trial_ends_at: string | null;
  } | null;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  max_students: number;
  included_schools: number;
  addon_school_price_cents: number;
  features: any;
  is_active: boolean;
}

interface MrrHistoryItem {
  month_date: string;
  mrr_cents: number;
}

interface UserGrowthItem {
  month_date: string;
  new_users: number;
  new_schools: number;
}

interface PlanDistributionItem {
  plan_name: string;
  plan_slug: string;
  subscribers: number;
}

interface DailyLoginItem {
  login_date: string;
  logins: number;
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
    refetchInterval: 60000,
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

  // Get schools overview (from RPC)
  const { data: schoolsOverview, isLoading: loadingSchoolsOverview, refetch: refetchSchoolsOverview } = useQuery({
    queryKey: ['schools-overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_schools_overview');
      if (error) throw error;
      return data as unknown as SchoolOverview[];
    },
    enabled: isSuperAdmin === true,
  });

  // Get admins overview (from RPC)
  const { data: adminsOverview, isLoading: loadingAdminsOverview, refetch: refetchAdminsOverview } = useQuery({
    queryKey: ['admins-overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admins_overview');
      if (error) throw error;
      return data as unknown as AdminOverview[];
    },
    enabled: isSuperAdmin === true,
  });

  // Get subscription plans
  const { data: subscriptionPlans, isLoading: loadingPlans } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_subscription_plans');
      if (error) throw error;
      return data as unknown as SubscriptionPlan[];
    },
    enabled: isSuperAdmin === true,
  });

  // Get MRR history
  const { data: mrrHistory, isLoading: loadingMrrHistory } = useQuery({
    queryKey: ['mrr-history'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_mrr_history');
      if (error) throw error;
      return data as unknown as MrrHistoryItem[];
    },
    enabled: isSuperAdmin === true,
  });

  // Get user growth
  const { data: userGrowth, isLoading: loadingUserGrowth } = useQuery({
    queryKey: ['user-growth'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_growth');
      if (error) throw error;
      return data as unknown as UserGrowthItem[];
    },
    enabled: isSuperAdmin === true,
  });

  // Get plan distribution
  const { data: planDistribution, isLoading: loadingPlanDistribution } = useQuery({
    queryKey: ['plan-distribution'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_plan_distribution');
      if (error) throw error;
      return data as unknown as PlanDistributionItem[];
    },
    enabled: isSuperAdmin === true,
  });

  // Get daily logins
  const { data: dailyLogins, isLoading: loadingDailyLogins } = useQuery({
    queryKey: ['daily-logins'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_daily_logins');
      if (error) throw error;
      return data as unknown as DailyLoginItem[];
    },
    enabled: isSuperAdmin === true,
  });

  // Update school mutation
  const updateSchool = useMutation({
    mutationFn: async (params: {
      schoolId: string;
      name?: string;
      slug?: string;
      logo_url?: string;
      primary_color?: string;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase.rpc('update_school_admin', {
        p_school_id: params.schoolId,
        p_name: params.name || null,
        p_slug: params.slug || null,
        p_logo_url: params.logo_url || null,
        p_primary_color: params.primary_color || null,
        p_is_active: params.is_active ?? null,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools-overview'] });
      queryClient.invalidateQueries({ queryKey: ['platform-metrics'] });
    },
  });

  // Update subscription mutation
  const updateSubscription = useMutation({
    mutationFn: async (params: {
      adminId: string;
      planId?: string;
      status?: string;
      addonSchoolsCount?: number;
      trialEndsAt?: string | null;
      expiresAt?: string | null;
      discountPercent?: number;
      discountCents?: number;
      discountReason?: string | null;
      implantationPaid?: boolean;
      implantationNotes?: string | null;
    }) => {
      // Primeiro atualiza via RPC os campos principais
      const { data, error } = await supabase.rpc('update_subscription_admin', {
        p_admin_id: params.adminId,
        p_plan_id: params.planId || null,
        p_status: params.status || null,
        p_addon_schools_count: params.addonSchoolsCount ?? null,
        p_trial_ends_at: params.trialEndsAt || null,
        p_expires_at: params.expiresAt || null,
        p_discount_percent: params.discountPercent ?? null,
        p_discount_cents: params.discountCents ?? null,
        p_discount_reason: params.discountReason || null,
      });
      
      if (error) throw error;

      // Atualiza campos de implantação separadamente (não estão na RPC)
      const updateData: Record<string, unknown> = {};
      if (params.implantationPaid !== undefined) {
        updateData.implantation_paid = params.implantationPaid;
        if (params.implantationPaid) {
          updateData.implantation_paid_at = new Date().toISOString();
        } else {
          updateData.implantation_paid_at = null;
        }
      }
      if (params.implantationNotes !== undefined) {
        updateData.implantation_notes = params.implantationNotes;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('admin_subscriptions')
          .update(updateData)
          .eq('admin_id', params.adminId);
        
        if (updateError) throw updateError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins-overview'] });
      queryClient.invalidateQueries({ queryKey: ['schools-overview'] });
      queryClient.invalidateQueries({ queryKey: ['platform-metrics'] });
    },
  });

  // Toggle test account
  const toggleTestAccount = useMutation({
    mutationFn: async (params: { adminId: string; isTest: boolean }) => {
      const { error } = await supabase
        .from('admin_subscriptions')
        .update({ is_test_account: params.isTest })
        .eq('admin_id', params.adminId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins-overview'] });
      queryClient.invalidateQueries({ queryKey: ['platform-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['mrr-history'] });
    },
  });

  return {
    isSuperAdmin,
    checkingStatus,
    metrics,
    loadingMetrics,
    refetchMetrics,
    schoolsOverview,
    loadingSchoolsOverview,
    refetchSchoolsOverview,
    adminsOverview,
    loadingAdminsOverview,
    refetchAdminsOverview,
    subscriptionPlans,
    loadingPlans,
    mrrHistory,
    loadingMrrHistory,
    userGrowth,
    loadingUserGrowth,
    planDistribution,
    loadingPlanDistribution,
    dailyLogins,
    loadingDailyLogins,
    auditLogs,
    loadingAuditLogs,
    logAction,
    updateSchool,
    updatingSchool: updateSchool.isPending,
    updateSubscription,
    updatingSubscription: updateSubscription.isPending,
    toggleTestAccount,
    togglingTestAccount: toggleTestAccount.isPending,
  };
}
