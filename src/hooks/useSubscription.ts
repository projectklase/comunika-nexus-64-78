import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';

export interface SubscriptionLimits {
  has_subscription: boolean;
  plan_name?: string;
  plan_slug?: string;
  current_students: number;
  max_students: number;
  current_schools: number;
  max_schools: number;
  can_add_students: boolean;
  can_add_schools: boolean;
  addon_school_price_cents?: number;
  students_remaining: number;
  schools_remaining: number;
  message?: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const { currentSchool } = useSchool();

  // Para secretárias, buscar o admin_id da escola atual
  const { data: schoolAdminId } = useQuery({
    queryKey: ['school-admin', currentSchool?.id],
    queryFn: async () => {
      if (!currentSchool?.id) return null;
      
      const { data, error } = await supabase
        .from('school_memberships')
        .select('user_id')
        .eq('school_id', currentSchool.id)
        .eq('role', 'administrador')
        .single();
      
      if (error) {
        console.error('[useSubscription] Error fetching school admin:', error);
        return null;
      }
      
      return data?.user_id || null;
    },
    enabled: !!currentSchool?.id && user?.role !== 'administrador',
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });

  // Determinar qual admin_id usar para verificar limites
  const effectiveAdminId = user?.role === 'administrador' ? user?.id : schoolAdminId;

  // Fetch subscription limits
  const { data: limits, isLoading, refetch } = useQuery({
    queryKey: ['subscription-limits', effectiveAdminId],
    queryFn: async (): Promise<SubscriptionLimits> => {
      if (!effectiveAdminId) {
        return {
          has_subscription: false,
          current_students: 0,
          max_students: 0,
          current_schools: 0,
          max_schools: 0,
          can_add_students: false,
          can_add_schools: false,
          students_remaining: 0,
          schools_remaining: 0,
          message: 'Administrador não encontrado'
        };
      }

      const { data, error } = await supabase.rpc('check_subscription_limits', {
        p_admin_id: effectiveAdminId
      });

      if (error) {
        console.error('[useSubscription] Error checking limits:', error);
        throw error;
      }

      return data as unknown as SubscriptionLimits;
    },
    enabled: !!effectiveAdminId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // Fetch all active subscription plans
  const { data: allPlans } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_cents');
      
      if (error) {
        console.error('[useSubscription] Error fetching plans:', error);
        throw error;
      }

      return data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes cache for plans
  });

  // Calculate next plan for upgrade
  const nextPlan = allPlans?.find(plan => 
    plan.max_students > (limits?.max_students || 0) || 
    plan.included_schools > (limits?.max_schools || 0)
  );

  const validateStudentCreation = async (schoolId: string): Promise<{
    can_create: boolean;
    message: string;
    current_students?: number;
    max_students?: number;
    students_remaining?: number;
  }> => {
    try {
      const { data, error } = await supabase.rpc('validate_student_creation', {
        p_school_id: schoolId
      });

      if (error) {
        console.error('[useSubscription] Error validating student creation:', error);
        return {
          can_create: false,
          message: 'Erro ao validar limites de assinatura'
        };
      }

      return data as any;
    } catch (error) {
      console.error('[useSubscription] Exception validating student creation:', error);
      return {
        can_create: false,
        message: 'Erro ao validar limites de assinatura'
      };
    }
  };

  return {
    limits,
    isLoading,
    refetch,
    validateStudentCreation,
    canAddStudents: limits?.can_add_students ?? false,
    canAddSchools: limits?.can_add_schools ?? false,
    hasSubscription: limits?.has_subscription ?? false,
    allPlans,
    nextPlan,
  };
}
