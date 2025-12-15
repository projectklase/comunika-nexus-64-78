import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';

export interface RetentionMetrics {
  total_enrolled: number;
  active_students: number;
  retention_rate: number; // %
  avg_days_active: number;
  enrollment_trend: Array<{ month: string; enrolled: number; active: number }>;
}

export function useRetentionMetrics(daysFilter: number = 30) {
  const { currentSchool } = useSchool();

  return useQuery({
    queryKey: ['retention-metrics', daysFilter, currentSchool?.id],
    queryFn: async (): Promise<RetentionMetrics> => {
      if (!currentSchool) {
        throw new Error('Escola não selecionada');
      }

      // Total de alunos matriculados desta escola (via classes)
      const { data: classStudents, error: csError } = await supabase
        .from('class_students')
        .select('student_id, classes!inner(school_id)')
        .eq('classes.school_id', currentSchool.id);
      
      if (csError) throw csError;
      
      const totalEnrolled = classStudents?.length || 0;
      
      // Alunos ativos (com entregas nos últimos 30 dias) desta escola
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: activeDeliveries, error: adError } = await supabase
        .from('deliveries')
        .select('student_id')
        .eq('school_id', currentSchool.id)
        .gte('submitted_at', thirtyDaysAgo);
      
      if (adError) throw adError;
      
      const activeStudentsSet = new Set(activeDeliveries?.map(d => d.student_id) || []);
      const activeStudents = activeStudentsSet.size;
      
      const retentionRate = totalEnrolled > 0 ? (activeStudents / totalEnrolled) * 100 : 0;
      
      // Calcular tempo médio de atividade (baseado nas entregas desta escola)
      const { data: studentActivity, error: saError } = await supabase
        .from('deliveries')
        .select('student_id, submitted_at')
        .eq('school_id', currentSchool.id)
        .order('submitted_at', { ascending: true });
      
      if (saError) throw saError;
      
      const studentFirstActivity: Record<string, string> = {};
      const studentLastActivity: Record<string, string> = {};
      
      studentActivity?.forEach(({ student_id, submitted_at }) => {
        if (!studentFirstActivity[student_id]) {
          studentFirstActivity[student_id] = submitted_at;
        }
        studentLastActivity[student_id] = submitted_at;
      });
      
      let totalDays = 0;
      let studentsWithActivity = 0;
      
      Object.keys(studentFirstActivity).forEach((student_id) => {
        const firstActivity = studentFirstActivity[student_id];
        const lastActivity = studentLastActivity[student_id];
        if (firstActivity && lastActivity) {
          const firstDate = new Date(firstActivity);
          const lastDate = new Date(lastActivity);
          const diffDays = Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0) {
            totalDays += diffDays;
            studentsWithActivity++;
          }
        }
      });
      
      const avgDaysActive = studentsWithActivity > 0 ? Math.round(totalDays / studentsWithActivity) : 0;
      
      // Gerar tendência dos últimos 6 meses com dados reais
      const enrollmentTrend: Array<{ month: string; enrolled: number; active: number }> = [];
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
        
        // Alunos matriculados até o final do mês
        const { data: monthEnrollments } = await supabase
          .from('class_students')
          .select('student_id, classes!inner(school_id)')
          .eq('classes.school_id', currentSchool.id);
        
        // Alunos ativos no mês (com entregas)
        const { data: monthDeliveries } = await supabase
          .from('deliveries')
          .select('student_id')
          .eq('school_id', currentSchool.id)
          .gte('submitted_at', monthStart.toISOString())
          .lte('submitted_at', monthEnd.toISOString());
        
        const monthEnrolled = monthEnrollments?.length || 0;
        const monthActive = new Set(monthDeliveries?.map(d => d.student_id) || []).size;
        
        enrollmentTrend.push({
          month: monthNames[monthDate.getMonth()],
          enrolled: monthEnrolled,
          active: monthActive
        });
      }
      
      return {
        total_enrolled: totalEnrolled,
        active_students: activeStudents,
        retention_rate: retentionRate,
        avg_days_active: avgDaysActive,
        enrollment_trend: enrollmentTrend
      };
    },
    enabled: !!currentSchool,
    staleTime: 5 * 60 * 1000,
  });
}
