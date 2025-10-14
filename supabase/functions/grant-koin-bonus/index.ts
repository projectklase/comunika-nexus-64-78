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
    const { eventName, eventDescription, koinAmount, studentIds, grantedBy } = await req.json();

    console.log(`[grant-koin-bonus] Iniciando bonificação: ${eventName} - ${koinAmount} Koins para ${studentIds.length} alunos`);

    // Validações básicas
    if (!eventName || typeof eventName !== 'string' || eventName.trim() === '') {
      console.error('[grant-koin-bonus] Nome do evento inválido');
      return new Response(
        JSON.stringify({ error: 'Nome do evento é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!koinAmount || typeof koinAmount !== 'number' || koinAmount <= 0) {
      console.error('[grant-koin-bonus] Valor de Koins inválido:', koinAmount);
      return new Response(
        JSON.stringify({ error: 'Valor de Koins deve ser maior que zero' }),
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

    // Chamar RPC function que executa a operação com privilégios elevados
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

    console.log(`[grant-koin-bonus] Bonificação concedida com sucesso para ${studentIds.length} alunos`);

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
