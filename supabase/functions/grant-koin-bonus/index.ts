import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Criar cliente Supabase com service role para operações privilegiadas
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Extrair dados do body da requisição
    const { eventName, eventDescription, koinAmount, xpAmount, studentIds, grantedBy } = await req.json();

    console.log(`[grant-koin-bonus] Iniciando bonificação: ${eventName} - ${koinAmount} Koins, ${xpAmount || 0} XP para ${studentIds.length} alunos`);

    // Validações básicas
    if (!eventName || typeof eventName !== 'string' || eventName.trim() === '') {
      console.error('[grant-koin-bonus] Nome do evento inválido');
      return new Response(
        JSON.stringify({ error: 'Nome do evento é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar que pelo menos Koins ou XP foi informado
    const hasKoins = koinAmount && typeof koinAmount === 'number' && koinAmount > 0;
    const hasXP = xpAmount && typeof xpAmount === 'number' && xpAmount > 0;
    
    if (!hasKoins && !hasXP) {
      console.error('[grant-koin-bonus] Nenhuma recompensa informada');
      return new Response(
        JSON.stringify({ error: 'Informe pelo menos Koins ou XP para a bonificação' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      console.error('[grant-koin-bonus] Lista de alunos vazia ou inválida');
      return new Response(
        JSON.stringify({ error: 'Selecione pelo menos um aluno' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!grantedBy || typeof grantedBy !== 'string') {
      console.error('[grant-koin-bonus] ID do responsável inválido');
      return new Response(
        JSON.stringify({ error: 'Responsável pela bonificação não identificado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Chamar RPC function que executa a operação com privilégios elevados (apenas para Koins)
    if (hasKoins) {
      const { error: rpcError } = await supabaseAdmin.rpc('grant_koin_bonus', {
        p_event_name: eventName,
        p_event_description: eventDescription || '',
        p_koin_amount: koinAmount,
        p_student_ids: studentIds,
        p_granted_by: grantedBy,
      });

      if (rpcError) {
        console.error('[grant-koin-bonus] Erro ao executar RPC:', rpcError);
        throw rpcError;
      }
    }

    // Conceder XP diretamente na tabela profiles se informado
    if (hasXP) {
      for (const studentId of studentIds) {
        const { error: xpError } = await supabaseAdmin
          .from('profiles')
          .update({ total_xp: supabaseAdmin.rpc('add_xp_to_user', { user_id_in: studentId, amount_in: xpAmount }) })
          .eq('id', studentId);
        
        // Fallback: incrementar XP manualmente se RPC não existir
        if (xpError) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('total_xp')
            .eq('id', studentId)
            .single();
          
          await supabaseAdmin
            .from('profiles')
            .update({ total_xp: (profile?.total_xp || 0) + xpAmount })
            .eq('id', studentId);
        }
      }
      console.log(`[grant-koin-bonus] ${xpAmount} XP concedido para ${studentIds.length} alunos`);
    }

    console.log(`[grant-koin-bonus] Bonificação concedida com sucesso para ${studentIds.length} alunos`);

    // Montar mensagem dinâmica para notificação
    const rewardParts: string[] = [];
    if (hasKoins) rewardParts.push(`${koinAmount} Koins`);
    if (hasXP) rewardParts.push(`${xpAmount} XP`);
    const rewardMessage = rewardParts.join(' e ');

    // Determinar link e tipo baseado no tipo de recompensa
    const notificationLink = hasKoins 
      ? '/aluno/loja-recompensas?tab=history'  // Koins → loja de recompensas
      : '/aluno/perfil';  // Apenas XP → perfil do aluno
    
    const notificationType = hasKoins ? 'KOIN_BONUS' : 'XP_EARNED';

    // Criar notificações para cada aluno usando service_role (sem RLS)
    const notificationPromises = studentIds.map(studentId => 
      supabaseAdmin.from('notifications').insert({
        user_id: studentId,
        type: notificationType,
        title: hasKoins ? 'Bonificação Recebida!' : 'XP Recebido!',
        message: `Você recebeu ${rewardMessage} pelo evento '${eventName}'!`,
        role_target: 'ALUNO',
        link: notificationLink,
        is_read: false,
        meta: { 
          koinAmount: koinAmount || 0,
          xpAmount: xpAmount || 0,
          eventName: eventName,
          grantedBy: grantedBy
        }
      })
    );

    const notificationResults = await Promise.allSettled(notificationPromises);
    const failedNotifications = notificationResults.filter(r => r.status === 'rejected');
    
    if (failedNotifications.length > 0) {
      console.error('[grant-koin-bonus] Algumas notificações falharam:', failedNotifications);
      // Não lançar erro - bonificação já foi concedida com sucesso
    } else {
      console.log(`[grant-koin-bonus] ${studentIds.length} notificações criadas com sucesso`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Bonificação de ${koinAmount} Koins concedida para ${studentIds.length} aluno(s)`,
        affectedStudents: studentIds.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[grant-koin-bonus] Erro na edge function:', error);
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Erro ao processar bonificação',
        details: error?.hint || error?.details || null
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
