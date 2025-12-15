import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';

export interface PulseScoreData {
  overall_score: number; // 0-100
  components: {
    engagement: number;
    teacher_performance: number;
    occupancy: number;
    approval_rate: number;
    retention: number;
  };
  trend: Array<{ date: string; score: number }>;
}

export function usePulseScore(daysFilter: number = 30) {
  const { currentSchool } = useSchool();

  return useQuery({
    queryKey: ['pulse-score', daysFilter, currentSchool?.id],
    queryFn: async (): Promise<PulseScoreData> => {
      if (!currentSchool) {
        throw new Error('Escola não selecionada');
      }

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      // 1. Engajamento (30%) - % alunos com entregas nos últimos 7 dias
      const { data: recentDeliveries } = await supabase
        .from('deliveries')
        .select('student_id')
        .eq('school_id', currentSchool.id)
        .gte('submitted_at', sevenDaysAgo);
      
      // Total de alunos desta escola
      const { data: schoolClasses } = await supabase
        .from('classes')
        .select('id')
        .eq('school_id', currentSchool.id);
      
      const classIds = schoolClasses?.map(c => c.id) || [];
      
      const { count: totalStudents } = await supabase
        .from('class_students')
        .select('*', { count: 'exact', head: true })
        .in('class_id', classIds);
      
      const uniqueActiveStudents = new Set(recentDeliveries?.map(d => d.student_id) || []).size;
      const engagementScore = totalStudents && totalStudents > 0 
        ? (uniqueActiveStudents / totalStudents) * 100 
        : 0;
      
      // 2. Performance Professores (25%) - % atividades avaliadas em até 48h
      const { data: deliveries } = await supabase
        .from('deliveries')
        .select('submitted_at, reviewed_at')
        .eq('school_id', currentSchool.id)
        .not('reviewed_at', 'is', null)
        .gte('submitted_at', thirtyDaysAgo);
      
      let evaluatedIn48h = 0;
      deliveries?.forEach(d => {
        const submitTime = new Date(d.submitted_at).getTime();
        const reviewTime = new Date(d.reviewed_at!).getTime();
        const hoursDiff = (reviewTime - submitTime) / (1000 * 60 * 60);
        if (hoursDiff <= 48) evaluatedIn48h++;
      });
      
      const totalEvaluated = deliveries?.length || 0;
      const teacherScore = totalEvaluated > 0 ? (evaluatedIn48h / totalEvaluated) * 100 : 0;
      
      // 3. Ocupação (20%) - % médio de vagas preenchidas
      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .eq('status', 'Ativa')
        .eq('school_id', currentSchool.id);
      
      let totalOccupancy = 0;
      const classCount = classes?.length || 0;
      
      for (const cls of classes || []) {
        const { count } = await supabase
          .from('class_students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id);
        
        const capacity = 30;
        totalOccupancy += count && capacity > 0 ? (count / capacity) * 100 : 0;
      }
      
      const occupancyScore = classCount > 0 ? totalOccupancy / classCount : 0;
      
      // 4. Taxa Aprovação (15%) - aprovadas/total
      const { data: allDeliveries } = await supabase
        .from('deliveries')
        .select('review_status')
        .eq('school_id', currentSchool.id)
        .not('review_status', 'is', null)
        .gte('submitted_at', thirtyDaysAgo);
      
      const approvedCount = allDeliveries?.filter(d => d.review_status === 'APROVADO').length || 0;
      const totalReviewed = allDeliveries?.length || 0;
      const approvalScore = totalReviewed > 0 ? (approvedCount / totalReviewed) * 100 : 0;
      
      // 5. Retenção (10%) - alunos ativos há 30+ dias / total
      const { data: oldDeliveries } = await supabase
        .from('deliveries')
        .select('student_id')
        .eq('school_id', currentSchool.id)
        .gte('submitted_at', thirtyDaysAgo);
      
      const retainedStudents = new Set(oldDeliveries?.map(d => d.student_id) || []).size;
      const retentionScore = totalStudents && totalStudents > 0 
        ? (retainedStudents / totalStudents) * 100 
        : 0;
      
      // Calcular score geral
      const overallScore = Math.round(
        (engagementScore * 0.30) +
        (teacherScore * 0.25) +
        (occupancyScore * 0.20) +
        (approvalScore * 0.15) +
        (retentionScore * 0.10)
      );
      
      // Gerar tendência baseada em dados reais dos últimos 30 dias
      const trend: Array<{ date: string; score: number }> = [];
      
      for (let i = 29; i >= 0; i--) {
        const dayStart = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        
        // Buscar entregas do dia
        const { data: dayDeliveries } = await supabase
          .from('deliveries')
          .select('student_id, review_status, submitted_at, reviewed_at')
          .eq('school_id', currentSchool.id)
          .gte('submitted_at', dayStart.toISOString())
          .lte('submitted_at', dayEnd.toISOString());
        
        // Calcular score do dia baseado em atividade real
        const dayActiveStudents = new Set(dayDeliveries?.map(d => d.student_id) || []).size;
        const dayEngagement = totalStudents && totalStudents > 0 
          ? (dayActiveStudents / totalStudents) * 100 
          : 0;
        
        const dayApproved = dayDeliveries?.filter(d => d.review_status === 'APROVADO').length || 0;
        const dayTotal = dayDeliveries?.length || 0;
        const dayApprovalRate = dayTotal > 0 ? (dayApproved / dayTotal) * 100 : 0;
        
        // Calcular score ponderado do dia (engajamento + aprovação)
        const dayScore = dayTotal > 0 
          ? Math.round((dayEngagement * 0.6) + (dayApprovalRate * 0.4))
          : overallScore; // Usar score geral se não houver dados do dia
        
        trend.push({
          date: dayStart.toISOString().split('T')[0],
          score: Math.max(0, Math.min(100, dayScore))
        });
      }
      
      return {
        overall_score: overallScore,
        components: {
          engagement: Math.round(engagementScore),
          teacher_performance: Math.round(teacherScore),
          occupancy: Math.round(occupancyScore),
          approval_rate: Math.round(approvalScore),
          retention: Math.round(retentionScore)
        },
        trend
      };
    },
    enabled: !!currentSchool,
    staleTime: 5 * 60 * 1000,
  });
}
