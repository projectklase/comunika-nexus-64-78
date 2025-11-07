import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';

export interface LoginHeatmapDataPoint {
  day_of_week: number;
  hour: number;
  count: number;
  roles: Array<{ role: string; count: number }>;
}

export interface LoginHeatmapData {
  heatmap_data: LoginHeatmapDataPoint[];
  peak_hour: string;
  peak_day: string;
  total_logins: number;
}

type LoginRoleFilter = 'all' | 'aluno' | 'professor' | 'secretaria';

function processLoginHeatmapData(
  data: any[], 
  roleFilter: LoginRoleFilter
): LoginHeatmapDataPoint[] {
  const groupedByCell: Record<string, Record<string, number>> = {};
  
  data?.forEach(item => {
    if (!item.logged_at) return;
    const date = new Date(item.logged_at);
    const dow = date.getDay();
    const hour = date.getHours();
    const key = `${dow}-${hour}`;
    
    if (!groupedByCell[key]) {
      groupedByCell[key] = {};
    }
    
    const role = item.user_role || 'unknown';
    groupedByCell[key][role] = (groupedByCell[key][role] || 0) + 1;
  });
  
  return Object.entries(groupedByCell).map(([key, roles]) => {
    const [dow, hour] = key.split('-').map(Number);
    const totalCount = Object.values(roles).reduce((sum, count) => sum + count, 0);
    const rolesArray = Object.entries(roles).map(([role, count]) => ({ role, count }));
    
    return {
      day_of_week: dow,
      hour,
      count: totalCount,
      roles: rolesArray
    };
  });
}

function findPeakHour(data: LoginHeatmapDataPoint[]): string {
  if (!data || data.length === 0) return '--';
  const peak = data.reduce((max, curr) => curr.count > max.count ? curr : max, data[0]);
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return `${days[peak.day_of_week]} ${peak.hour}h`;
}

function findPeakDay(data: LoginHeatmapDataPoint[]): string {
  if (!data || data.length === 0) return '--';
  const dayTotals = data.reduce((acc, { day_of_week, count }) => {
    acc[day_of_week] = (acc[day_of_week] || 0) + count;
    return acc;
  }, {} as Record<number, number>);
  
  const peakDayIdx = Object.entries(dayTotals).reduce((max, [day, count]) => 
    count > (dayTotals[max] || 0) ? parseInt(day) : max, 0
  );
  
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[peakDayIdx];
}

export function useLoginHeatmap(daysFilter: number = 30, roleFilter: LoginRoleFilter = 'all') {
  const { currentSchool } = useSchool();

  return useQuery({
    queryKey: ['login-heatmap', daysFilter, roleFilter, currentSchool?.id],
    queryFn: async (): Promise<LoginHeatmapData> => {
      if (!currentSchool) {
        throw new Error('Escola não selecionada');
      }
      const startDate = new Date(Date.now() - daysFilter * 24 * 60 * 60 * 1000).toISOString();
      
      let query = supabase
        .from('login_history')
        .select('logged_at, user_role')
        .gte('logged_at', startDate)
        .in('user_role', ['aluno', 'professor', 'secretaria'])
        .order('logged_at', { ascending: false });
      
      // Aplicar filtro de role se não for "all"
      if (roleFilter !== 'all') {
        query = query.eq('user_role', roleFilter);
      }
      
      const { data: loginData, error } = await query;
      
      if (error) throw error;
      
      const heatmapData = processLoginHeatmapData(loginData || [], roleFilter);
      
      const uniqueRoles = [...new Set(loginData?.map(l => l.user_role) || [])];
      console.log('🔐 Login Heatmap Debug:', {
        filter: roleFilter,
        totalLogins: loginData?.length,
        uniqueRoles,
        heatmapPoints: heatmapData.length,
        sampleData: heatmapData.slice(0, 3)
      });
      
      return {
        heatmap_data: heatmapData,
        peak_hour: findPeakHour(heatmapData),
        peak_day: findPeakDay(heatmapData),
        total_logins: loginData?.length || 0
      };
    },
    enabled: !!currentSchool,
    staleTime: 30 * 1000, // Refetch a cada 30 segundos
    refetchInterval: 30 * 1000, // Atualização automática
  });
}
