import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    console.log('🔄 Iniciando atualização de LOGIN_STREAK challenges...');

    // 1. Buscar alunos que logaram nas últimas 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: { users }, error: usersError } = await supabaseClient.auth.admin.listUsers();
    
    if (usersError) {
      throw new Error(`Erro ao buscar usuários: ${usersError.message}`);
    }

    // Filtrar alunos com last_sign_in recente
    const activeStudents = users.filter(u => 
      u.last_sign_in_at && new Date(u.last_sign_in_at) > new Date(oneDayAgo)
    );

    console.log(`📊 ${activeStudents.length} alunos logaram nas últimas 24h`);

    let updatedCount = 0;
    let completedCount = 0;

    // 2. Para cada aluno, atualizar desafio LOGIN_STREAK
    for (const student of activeStudents) {
      const { data: challenge, error: challengeError } = await supabaseClient
        .from('student_challenges')
        .select(`
          id,
          current_progress,
          status,
          challenges!inner (
            id,
            title,
            koin_reward,
            action_count,
            action_target
          )
        `)
        .eq('student_id', student.id)
        .eq('status', 'IN_PROGRESS')
        .eq('challenges.action_target', 'LOGIN_STREAK')
        .maybeSingle();

      if (challengeError) {
        console.error(`❌ Erro ao buscar desafio para ${student.id}:`, challengeError);
        continue;
      }

      if (!challenge || !challenge.challenges) {
        continue;
      }

      // Extrair dados do desafio (Supabase retorna como objeto quando usa !inner)
      const challengeData = Array.isArray(challenge.challenges) 
        ? challenge.challenges[0] 
        : challenge.challenges;

      if (!challengeData) continue;

      // Incrementar progresso
      const newProgress = challenge.current_progress + 1;
      const isComplete = newProgress >= challengeData.action_count;

      if (isComplete) {
        // Completar desafio e recompensar
        const { error: completeError } = await supabaseClient.rpc('complete_challenge_and_reward', {
          p_student_id: student.id,
          p_student_challenge_id: challenge.id,
          p_koin_reward: challengeData.koin_reward,
          p_challenge_title: challengeData.title
        });

        if (completeError) {
          console.error(`❌ Erro ao completar desafio para ${student.id}:`, completeError);
        } else {
          completedCount++;
          console.log(`✅ Desafio "${challengeData.title}" completado para ${student.email}`);
        }
      } else {
        // Apenas incrementar progresso
        const { error: updateError } = await supabaseClient
          .from('student_challenges')
          .update({
            current_progress: newProgress,
            updated_at: new Date().toISOString()
          })
          .eq('id', challenge.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar progresso para ${student.id}:`, updateError);
        } else {
          updatedCount++;
          console.log(`📈 Progresso atualizado para ${student.email}: ${newProgress}/${challengeData.action_count}`);
        }
      }
    }

    console.log(`✅ Atualização concluída: ${updatedCount} incrementados, ${completedCount} completados`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        activeStudents: activeStudents.length,
        updatedCount,
        completedCount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('❌ Erro na Edge Function:', error);
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Erro desconhecido',
        details: error 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
