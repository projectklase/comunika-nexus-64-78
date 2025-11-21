import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';

export interface OperationalMetrics {
  occupancy_data: Array<{
    class_name: string;
    enrolled: number;
    capacity: number;
    occupancy_rate: number;
  }>;
  koins_distribution: {
    total_koins: number;
    avg_koins_per_student: number;
    total_students: number;
  };
  teacher_roi: Array<{
    teacher_name: string;
    students_count: number;
    delivery_rate: number; // %
  }>;
  avg_occupancy: number;
  koin_ecosystem_score: number;
}

export function useOperationalMetrics() {
  const { currentSchool } = useSchool();

  return useQuery({
    queryKey: ['operational-metrics', currentSchool?.id],
    queryFn: async (): Promise<OperationalMetrics> => {
      if (!currentSchool) {
        throw new Error('Escola não selecionada');
      }

      // Ocupação de turmas
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, name, status')
        .eq('status', 'Ativa')
        .eq('school_id', currentSchool.id);
      
      if (classError) throw classError;
      
      const occupancyData = await Promise.all(
        (classes || []).map(async (cls) => {
          const { count } = await supabase
            .from('class_students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id);
          
          const enrolled = count || 0;
          const capacity = 30; // Capacidade padrão
          const occupancyRate = capacity > 0 ? (enrolled / capacity) * 100 : 0;
          
          return {
            class_name: cls.name,
            enrolled,
            capacity,
            occupancy_rate: occupancyRate
          };
        })
      );
      
      const avgOccupancy = occupancyData.length > 0
        ? Math.round(occupancyData.reduce((sum, cls) => sum + cls.occupancy_rate, 0) / occupancyData.length)
        : 0;
      
      // Distribuição de Koins
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('koins')
        .eq('is_active', true)
        .in('id', 
          (await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'aluno')
          ).data?.map(r => r.user_id) || []
        );
      
      if (profileError) throw profileError;
      
      const totalKoins = profiles?.reduce((sum, p) => sum + (p.koins || 0), 0) || 0;
      const totalStudents = profiles?.length || 0;
      const avgKoins = totalStudents > 0 ? totalKoins / totalStudents : 0;
      
      // ROI de professores (simplificado)
      const { data: teacherClasses, error: tcError } = await supabase
        .from('classes')
        .select('main_teacher_id, id')
        .eq('status', 'Ativa')
        .not('main_teacher_id', 'is', null);
      
      if (tcError) throw tcError;
      
      const teacherRoi = await Promise.all(
        (teacherClasses || []).map(async (tc) => {
          const { data: teacher } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', tc.main_teacher_id)
            .single();
          
          const { count: studentsCount } = await supabase
            .from('class_students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', tc.id);
          
          const { data: deliveries } = await supabase
            .from('deliveries')
            .select('review_status')
            .in('student_id', 
              (await supabase
                .from('class_students')
                .select('student_id')
                .eq('class_id', tc.id)
              ).data?.map(cs => cs.student_id) || []
            );
          
          const totalDeliveries = deliveries?.length || 0;
          const approvedDeliveries = deliveries?.filter(d => d.review_status === 'APROVADO').length || 0;
          const deliveryRate = totalDeliveries > 0 ? (approvedDeliveries / totalDeliveries) * 100 : 0;
          
          return {
            teacher_name: teacher?.name || 'Não definido',
            students_count: studentsCount || 0,
            delivery_rate: deliveryRate
          };
        })
      );
      
      // Agrupar por professor
      const teacherRoiMap: Record<string, { students: number; rate: number; count: number }> = {};
      teacherRoi.forEach(({ teacher_name, students_count, delivery_rate }) => {
        if (!teacherRoiMap[teacher_name]) {
          teacherRoiMap[teacher_name] = { students: 0, rate: 0, count: 0 };
        }
        teacherRoiMap[teacher_name].students += students_count;
        teacherRoiMap[teacher_name].rate += delivery_rate;
        teacherRoiMap[teacher_name].count += 1;
      });
      
      const teacherRoiFinal = Object.entries(teacherRoiMap).map(([name, data]) => ({
        teacher_name: name,
        students_count: data.students,
        delivery_rate: data.count > 0 ? data.rate / data.count : 0
      }));
      
      // Calcular Koin Ecosystem Score
      // Buscar alunos da escola via school_memberships
      const { data: schoolStudentIds } = await supabase
        .from('school_memberships')
        .select('user_id')
        .eq('school_id', currentSchool.id)
        .eq('role', 'aluno');
      
      const studentIds = schoolStudentIds?.map(sm => sm.user_id) || [];
      
      // Buscar perfis dos alunos
      const { data: studentProfiles } = await supabase
        .from('profiles')
        .select('id, koins')
        .in('id', studentIds);
      
      // Buscar transações da escola
      const { data: transactions } = await supabase
        .from('koin_transactions')
        .select('*')
        .eq('school_id', currentSchool.id);
      
      // Buscar resgates da escola
      const { data: redemptions } = await supabase
        .from('redemption_requests')
        .select('status, requested_at, processed_at')
        .eq('school_id', currentSchool.id);
      
      // Cálculo do score (0-100)
      let score = 0;
      let totalFactors = 0;
      
      // Fator 1: Taxa de Participação (30 pontos)
      if (studentProfiles && studentProfiles.length > 0) {
        const activeStudents = studentProfiles.filter(s => (s.koins || 0) > 0).length;
        const participationRate = (activeStudents / studentProfiles.length) * 100;
        score += (participationRate / 100) * 30;
        totalFactors++;
      }
      
      // Fator 2: Distribuição Média de Koins (25 pontos)
      // Quanto mais koins em circulação, melhor (normalizado até 1000 koins)
      if (avgKoins > 0) {
        const normalizedAvg = Math.min(avgKoins / 1000, 1);
        score += normalizedAvg * 25;
        totalFactors++;
      }
      
      // Fator 3: Velocidade de Circulação (25 pontos)
      if (transactions && transactions.length > 0) {
        const totalDistributed = transactions
          .filter(t => t.amount > 0)
          .reduce((sum, t) => sum + t.amount, 0);
        const totalSpent = transactions
          .filter(t => t.amount < 0)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
        if (totalDistributed > 0) {
          const circulationVelocity = Math.min(totalSpent / totalDistributed, 1);
          score += circulationVelocity * 25;
          totalFactors++;
        }
      }
      
      // Fator 4: Taxa de Aprovação de Resgates (20 pontos)
      if (redemptions && redemptions.length > 0) {
        const approved = redemptions.filter(r => r.status === 'APROVADO').length;
        const approvalRate = approved / redemptions.length;
        score += approvalRate * 20;
        totalFactors++;
      }
      
      // Score final arredondado
      const koinEcosystemScore = totalFactors > 0 ? Math.round(score) : 0;
      
      return {
        occupancy_data: occupancyData,
        koins_distribution: {
          total_koins: totalKoins,
          avg_koins_per_student: avgKoins,
          total_students: totalStudents
        },
        teacher_roi: teacherRoiFinal,
        avg_occupancy: avgOccupancy,
        koin_ecosystem_score: koinEcosystemScore
      };
    },
    enabled: !!currentSchool,
    staleTime: 5 * 60 * 1000,
  });
}
