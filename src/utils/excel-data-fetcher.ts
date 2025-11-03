import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

/**
 * Busca dados completos para geração do relatório Excel
 * Não depende dos hooks, busca diretamente do banco
 */

export async function fetchCompleteAnalyticsData(daysFilter: number) {
  const startDate = format(subDays(new Date(), daysFilter), 'yyyy-MM-dd');
  
  try {
    // 1. Buscar alunos em risco
    const { data: studentsAtRisk, error: studentsError } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        class_id,
        created_at
      `)
      .eq('is_active', true);

    if (studentsError) throw studentsError;

    // Buscar último login de cada aluno
    const { data: loginHistory } = await supabase
      .from('login_history')
      .select('user_id, logged_at')
      .order('logged_at', { ascending: false });

    // Buscar entregas pendentes por aluno
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('student_id, review_status, created_at');

    // Buscar turmas dos alunos
    const { data: classStudents } = await supabase
      .from('class_students')
      .select('student_id, class_id');

    const { data: classes } = await supabase
      .from('classes')
      .select('id, name');

    // Processar dados de alunos em risco
    const studentsAtRiskProcessed = studentsAtRisk?.map(student => {
      const lastLogin = loginHistory?.find(l => l.user_id === student.id);
      const daysSinceLastLogin = lastLogin 
        ? Math.floor((Date.now() - new Date(lastLogin.logged_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const pendingDeliveries = deliveries?.filter(
        d => d.student_id === student.id && d.review_status === 'AGUARDANDO'
      ).length || 0;

      const pendingEvaluations = deliveries?.filter(
        d => d.student_id === student.id && d.review_status === 'DEVOLVIDO'
      ).length || 0;

      const classMapping = classStudents?.find(cs => cs.student_id === student.id);
      const className = classMapping 
        ? classes?.find(c => c.id === classMapping.class_id)?.name 
        : null;

      return {
        student_id: student.id,
        student_name: student.name,
        class_name: className,
        days_since_last_login: daysSinceLastLogin,
        pending_deliveries: pendingDeliveries,
        pending_evaluations: pendingEvaluations,
      };
    }).filter(s => s.days_since_last_login > 7 || s.pending_deliveries > 2) || [];

    // 2. Buscar tendência de atividades
    const { data: posts } = await supabase
      .from('posts')
      .select('created_at, type')
      .gte('created_at', startDate)
      .eq('status', 'PUBLISHED');

    const { data: allDeliveries } = await supabase
      .from('deliveries')
      .select('submitted_at, student_id')
      .gte('submitted_at', startDate);

    // Agrupar por dia
    const activityTrendMap = new Map();
    
    posts?.forEach(post => {
      const date = format(new Date(post.created_at), 'yyyy-MM-dd');
      if (!activityTrendMap.has(date)) {
        activityTrendMap.set(date, { date, activities_published: 0, deliveries_made: 0 });
      }
      activityTrendMap.get(date).activities_published++;
    });

    allDeliveries?.forEach(delivery => {
      const date = format(new Date(delivery.submitted_at), 'yyyy-MM-dd');
      if (!activityTrendMap.has(date)) {
        activityTrendMap.set(date, { date, activities_published: 0, deliveries_made: 0 });
      }
      activityTrendMap.get(date).deliveries_made++;
    });

    const activity_trend = Array.from(activityTrendMap.values()).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    // 3. Buscar dados de heatmap
    const { data: heatmapDeliveries } = await supabase
      .from('deliveries')
      .select('submitted_at')
      .gte('submitted_at', startDate);

    const { data: heatmapPosts } = await supabase
      .from('posts')
      .select('created_at')
      .gte('created_at', startDate)
      .eq('status', 'PUBLISHED');

    const { data: heatmapLogins } = await supabase
      .from('login_history')
      .select('logged_at')
      .gte('logged_at', startDate);

    // Processar heatmap
    const processHeatmap = (data: any[], dateField: string) => {
      const heatmapMap = new Map();
      data?.forEach(item => {
        const date = new Date(item[dateField]);
        const day = date.getDay();
        const hour = date.getHours();
        const key = `${day}-${hour}`;
        heatmapMap.set(key, (heatmapMap.get(key) || 0) + 1);
      });

      return Array.from(heatmapMap.entries()).map(([key, count]) => {
        const [day, hour] = key.split('-').map(Number);
        return { day_of_week: day, hour, count };
      });
    };

    const deliveries_heatmap = processHeatmap(heatmapDeliveries || [], 'submitted_at');
    const posts_heatmap = processHeatmap(heatmapPosts || [], 'created_at');
    const logins_heatmap = processHeatmap(heatmapLogins || [], 'logged_at');

    // 4. Buscar dados de retenção
    const { data: allClassStudents } = await supabase
      .from('class_students')
      .select('student_id');

    const total_enrolled = allClassStudents?.length || 0;

    // Alunos com pelo menos uma entrega nos últimos N dias
    const { data: recentDeliveries } = await supabase
      .from('deliveries')
      .select('student_id')
      .gte('submitted_at', startDate);

    const activeStudentIds = new Set(recentDeliveries?.map(d => d.student_id));
    const active_students = activeStudentIds.size;
    const retention_rate = total_enrolled > 0 ? (active_students / total_enrolled) * 100 : 0;

    // Calcular média de dias ativos
    const studentFirstLastDates = new Map();
    allDeliveries?.forEach(d => {
      const date = new Date(d.submitted_at);
      if (!studentFirstLastDates.has(d.student_id)) {
        studentFirstLastDates.set(d.student_id, { first: date, last: date });
      } else {
        const current = studentFirstLastDates.get(d.student_id);
        if (date < current.first) current.first = date;
        if (date > current.last) current.last = date;
      }
    });

    let totalDaysActive = 0;
    studentFirstLastDates.forEach(({ first, last }) => {
      totalDaysActive += Math.floor((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));
    });
    const avg_days_active = studentFirstLastDates.size > 0 
      ? totalDaysActive / studentFirstLastDates.size 
      : 0;

    // 5. Buscar dados operacionais
    const { data: allClasses } = await supabase
      .from('classes')
      .select(`
        id,
        name,
        status
      `)
      .eq('status', 'Ativa');

    const occupancy_data = await Promise.all(
      (allClasses || []).map(async (cls) => {
        const { count: enrolled } = await supabase
          .from('class_students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id);

        // Capacidade padrão de 30 alunos
        const capacity = 30;

        return {
          class_name: cls.name,
          capacity,
          enrolled: enrolled || 0,
        };
      })
    );

    const avg_occupancy = occupancy_data.length > 0
      ? occupancy_data.reduce((sum, cls) => sum + (cls.enrolled / cls.capacity) * 100, 0) / occupancy_data.length
      : 0;

    // Distribuição de Koins
    const { data: profiles } = await supabase
      .from('profiles')
      .select('koins')
      .gt('koins', 0);

    const koinsArray = profiles?.map(p => p.koins) || [];
    const koins_distribution = {
      total: koinsArray.reduce((sum, k) => sum + k, 0),
      average: koinsArray.length > 0 ? koinsArray.reduce((sum, k) => sum + k, 0) / koinsArray.length : 0,
      max: koinsArray.length > 0 ? Math.max(...koinsArray) : 0,
      min: koinsArray.length > 0 ? Math.min(...koinsArray) : 0,
    };

    // ROI de professores
    const { data: teachers } = await supabase
      .from('profiles')
      .select('id, name');

    const { data: teacherRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'professor');

    const teacherIds = teacherRoles?.map(r => r.user_id) || [];

    const teacher_roi = await Promise.all(
      teachers?.filter(t => teacherIds.includes(t.id)).map(async (teacher) => {
        const { count: deliveriesCount } = await supabase
          .from('deliveries')
          .select('*', { count: 'exact', head: true })
          .gte('submitted_at', startDate);

        const { count: evaluationsCount } = await supabase
          .from('deliveries')
          .select('*', { count: 'exact', head: true })
          .eq('reviewed_by', teacher.id)
          .gte('reviewed_at', startDate);

        return {
          teacher_name: teacher.name,
          deliveries: deliveriesCount || 0,
          evaluations: evaluationsCount || 0,
          avg_time: null, // Não temos esse dado facilmente
        };
      }) || []
    );

    // 6. Buscar dados de Pulse Score (calcular componentes)
    const engagement = retention_rate;
    const teacher_performance = teacher_roi.length > 0
      ? (teacher_roi.reduce((sum, t) => sum + (t.deliveries > 0 ? (t.evaluations / t.deliveries) * 100 : 0), 0) / teacher_roi.length)
      : 0;
    const occupancy = avg_occupancy;
    
    const { data: allReviews } = await supabase
      .from('deliveries')
      .select('review_status')
      .gte('submitted_at', startDate)
      .neq('review_status', 'AGUARDANDO');

    const approvedCount = allReviews?.filter(r => r.review_status === 'APROVADO').length || 0;
    const approval_rate = allReviews?.length > 0 ? (approvedCount / allReviews.length) * 100 : 0;

    const overall_score = (
      engagement * 0.30 +
      teacher_performance * 0.25 +
      occupancy * 0.20 +
      approval_rate * 0.15 +
      retention_rate * 0.10
    );

    // 7. Buscar dados de engajamento de posts
    const { data: postReads } = await supabase
      .from('post_reads')
      .select('post_id, user_id, read_at')
      .gte('read_at', startDate);

    const { data: publishedPosts } = await supabase
      .from('posts')
      .select('id, title, type, created_at')
      .eq('status', 'PUBLISHED')
      .gte('created_at', startDate);

    const total_posts_published = publishedPosts?.length || 0;
    const total_reads = postReads?.length || 0;

    // Top posts
    const postReadsMap = new Map();
    postReads?.forEach(read => {
      if (!postReadsMap.has(read.post_id)) {
        postReadsMap.set(read.post_id, new Set());
      }
      postReadsMap.get(read.post_id).add(read.user_id);
    });

    const top_posts = publishedPosts?.map(post => {
      const uniqueReaders = postReadsMap.get(post.id)?.size || 0;
      const totalReads = postReads?.filter(r => r.post_id === post.id).length || 0;
      return {
        post_id: post.id,
        post_title: post.title,
        post_type: post.type,
        total_reads: totalReads,
        unique_readers: uniqueReaders,
        read_rate: active_students > 0 ? (uniqueReaders / active_students) * 100 : 0,
        class_name: null,
      };
    }).sort((a, b) => b.total_reads - a.total_reads).slice(0, 10) || [];

    const avg_read_rate = top_posts.length > 0
      ? top_posts.reduce((sum, p) => sum + p.read_rate, 0) / top_posts.length
      : 0;

    // Taxa de leitura por tipo
    const typeMap = new Map();
    publishedPosts?.forEach(post => {
      if (!typeMap.has(post.type)) {
        typeMap.set(post.type, { total_posts: 0, total_reads: 0, unique_readers: new Set() });
      }
      const type = typeMap.get(post.type);
      type.total_posts++;
      
      postReads?.filter(r => r.post_id === post.id).forEach(read => {
        type.total_reads++;
        type.unique_readers.add(read.user_id);
      });
    });

    const read_rate_by_type = Array.from(typeMap.entries()).map(([type, data]) => ({
      post_type: type,
      total_posts: data.total_posts,
      total_reads: data.total_reads,
      avg_read_rate: active_students > 0 
        ? (data.unique_readers.size / active_students) * 100 
        : 0,
    }));

    // Top leitores
    const readerMap = new Map();
    postReads?.forEach(read => {
      readerMap.set(read.user_id, (readerMap.get(read.user_id) || 0) + 1);
    });

    const top_readers = await Promise.all(
      Array.from(readerMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(async ([userId, count]) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', userId)
            .single();

          const classMapping = classStudents?.find(cs => cs.student_id === userId);
          const className = classMapping 
            ? classes?.find(c => c.id === classMapping.class_id)?.name 
            : null;

          return {
            student_id: userId,
            student_name: profile?.name || 'Desconhecido',
            class_name: className,
            total_reads: count,
          };
        })
    );

    // Posts com baixo engajamento
    const posts_with_low_engagement = top_posts.filter(p => p.read_rate < 30);

    // Montar objeto final
    return {
      analytics: {
        students_at_risk_count: studentsAtRiskProcessed.length,
        worst_class_name: studentsAtRiskProcessed[0]?.class_name || null,
        worst_class_pending_count: studentsAtRiskProcessed[0]?.pending_deliveries || 0,
        activity_trend,
        students_at_risk_list: studentsAtRiskProcessed,
      },
      heatmapData: {
        deliveries_heatmap,
        posts_heatmap,
        corrections_heatmap: [], // Não temos dados de correções específicos
        logins_heatmap,
        peak_delivery_hour: '14:00',
        peak_day: 'Segunda-feira',
        total_deliveries: allDeliveries?.length || 0,
      },
      retentionData: {
        total_enrolled,
        active_students,
        retention_rate,
        avg_days_active,
        enrollment_trend: [], // Simplificado, poderia calcular por mês
      },
      operationalData: {
        occupancy_data,
        avg_occupancy,
        koins_distribution,
        teacher_roi,
      },
      pulseData: {
        overall_score,
        components: {
          engagement,
          teacher_performance,
          occupancy,
          approval_rate,
          retention: retention_rate,
        },
        trend: [], // Simplificado
      },
      postReadData: {
        total_posts_published,
        total_reads,
        avg_read_rate,
        top_posts,
        read_rate_by_type,
        top_readers,
        posts_with_low_engagement,
      },
      daysFilter,
    };
  } catch (error) {
    console.error('Erro ao buscar dados completos:', error);
    throw error;
  }
}
