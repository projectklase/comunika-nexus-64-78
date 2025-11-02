import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
}

export function useOperationalMetrics() {
  return useQuery({
    queryKey: ['operational-metrics'],
    queryFn: async (): Promise<OperationalMetrics> => {
      // Ocupação de turmas
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, name, status')
        .eq('status', 'Ativa');
      
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
      
      return {
        occupancy_data: occupancyData,
        koins_distribution: {
          total_koins: totalKoins,
          avg_koins_per_student: avgKoins,
          total_students: totalStudents
        },
        teacher_roi: teacherRoiFinal,
        avg_occupancy: avgOccupancy
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
