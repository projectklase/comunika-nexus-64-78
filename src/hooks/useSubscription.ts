import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

  const { data: limits, isLoading, refetch } = useQuery({
    queryKey: ['subscription-limits', user?.id],
    queryFn: async (): Promise<SubscriptionLimits> => {
      if (!user?.id) {
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
          message: 'Usuário não autenticado'
        };
      }

      const { data, error } = await supabase.rpc('check_subscription_limits', {
        p_admin_id: user.id
      });

      if (error) {
        console.error('[useSubscription] Error checking limits:', error);
        throw error;
      }

      return data as unknown as SubscriptionLimits;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

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
  };
}
