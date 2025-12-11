import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validar CRON_SECRET para jobs agendados
function validateCronSecret(req: Request): boolean {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret) {
    console.error('❌ CRON_SECRET não configurado');
    return false;
  }
  
  const authHeader = req.headers.get('Authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validar CRON_SECRET
  if (!validateCronSecret(req)) {
    console.error('❌ Unauthorized: CRON_SECRET inválido ou ausente');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('🔄 Iniciando renovação de desafios diários e semanais...');

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = domingo, 1 = segunda

    // Buscar IDs dos desafios DAILY
    const { data: dailyChallenges, error: dailyFetchError } = await supabase
      .from('challenges')
      .select('id')
      .eq('type', 'DAILY')
      .eq('is_active', true);

    if (dailyFetchError) {
      console.error('❌ Erro ao buscar desafios DAILY:', dailyFetchError);
    } else if (dailyChallenges && dailyChallenges.length > 0) {
      const dailyIds = dailyChallenges.map(c => c.id);
      
      // Expirar desafios DAILY do dia anterior
      const { error: expireDailyError } = await supabase
        .from('student_challenges')
        .update({ status: 'EXPIRED' })
        .eq('status', 'IN_PROGRESS')
        .lt('expires_at', new Date().toISOString())
        .in('challenge_id', dailyIds);

      if (expireDailyError) {
        console.error('❌ Erro ao expirar desafios DAILY:', expireDailyError);
      } else {
        console.log('✅ Desafios DAILY expirados com sucesso');
      }
    }

    // Se for segunda-feira, expirar desafios WEEKLY da semana anterior
    if (dayOfWeek === 1) {
      const { data: weeklyChallenges, error: weeklyFetchError } = await supabase
        .from('challenges')
        .select('id')
        .eq('type', 'WEEKLY')
        .eq('is_active', true);

      if (weeklyFetchError) {
        console.error('❌ Erro ao buscar desafios WEEKLY:', weeklyFetchError);
      } else if (weeklyChallenges && weeklyChallenges.length > 0) {
        const weeklyIds = weeklyChallenges.map(c => c.id);
        
        const { error: expireWeeklyError } = await supabase
          .from('student_challenges')
          .update({ status: 'EXPIRED' })
          .eq('status', 'IN_PROGRESS')
          .lt('expires_at', new Date().toISOString())
          .in('challenge_id', weeklyIds);

        if (expireWeeklyError) {
          console.error('❌ Erro ao expirar desafios WEEKLY:', expireWeeklyError);
        } else {
          console.log('✅ Desafios WEEKLY expirados com sucesso (segunda-feira)');
        }
      }
    }

    // Buscar todos os desafios ativos
    const { data: activeChallenges, error: fetchError } = await supabase
      .from('challenges')
      .select('id, title, type')
      .eq('is_active', true);

    if (fetchError) {
      console.error('❌ Erro ao buscar desafios ativos:', fetchError);
      throw fetchError;
    }

    console.log(`📋 Encontrados ${activeChallenges?.length || 0} desafios ativos`);

    // Para cada desafio ativo, chamar a função de atribuição
    for (const challenge of activeChallenges || []) {
      // Atribuir apenas desafios DAILY sempre, e WEEKLY apenas na segunda-feira
      if (challenge.type === 'DAILY' || (challenge.type === 'WEEKLY' && dayOfWeek === 1)) {
        const { data, error } = await supabase.rpc('assign_challenge_to_students', {
          p_challenge_id: challenge.id,
        });

        if (error) {
          console.error(`❌ Erro ao atribuir desafio "${challenge.title}":`, error);
        } else {
          console.log(`✅ Desafio "${challenge.title}" atribuído a ${data || 0} alunos`);
        }
      }
    }

    console.log('🎉 Renovação de desafios concluída com sucesso!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Desafios renovados com sucesso',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Erro na renovação de desafios:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
