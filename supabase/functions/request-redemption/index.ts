import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestRedemptionPayload {
  studentId: string;
  studentName: string;
  itemId: string;
  itemName: string;
  koinAmount: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { studentId, studentName, itemId, itemName, koinAmount }: RequestRedemptionPayload = await req.json();

    console.log(`[request-redemption] Iniciando resgate para aluno ${studentName} (${studentId}), item ${itemName} (${itemId})`);

    // Chamar a função RPC que cria o resgate e bloqueia o saldo
    const { error: rpcError } = await supabaseAdmin.rpc('request_redemption', {
      p_student_id: studentId,
      p_item_id: itemId
    });

    if (rpcError) {
      console.error('[request-redemption] Erro ao processar resgate:', rpcError);
      throw rpcError;
    }

    console.log('[request-redemption] Resgate criado com sucesso no banco de dados');

    // Buscar todos os usuários secretaria para notificar
    const { data: secretariaUsers, error: secretariaError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'secretaria');

    if (secretariaError) {
      console.error('[request-redemption] Erro ao buscar usuários secretaria:', secretariaError);
    }

    // Criar notificações para cada secretaria
    if (secretariaUsers && secretariaUsers.length > 0) {
      const notifications = secretariaUsers.map(({ user_id }) => ({
        user_id: user_id,
        type: 'REDEMPTION_REQUESTED',
        title: 'Nova solicitação de resgate',
        message: `O aluno ${studentName} deseja resgatar o item '${itemName}' (${koinAmount} Koins).`,
        role_target: 'SECRETARIA',
        link: '/secretaria/gerenciar-recompensas',
        is_read: false,
        meta: {
          studentId: studentId,
          studentName: studentName,
          itemId: itemId,
          itemName: itemName,
          koinAmount: koinAmount,
          requestType: 'redemption'
        }
      }));

      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('[request-redemption] Erro ao criar notificações:', notifError);
        // Não lançar erro - resgate já foi criado com sucesso
      } else {
        console.log(`[request-redemption] ${notifications.length} notificações criadas para secretaria`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Resgate solicitado com sucesso! Aguarde aprovação da secretaria.' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('[request-redemption] Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'Erro ao solicitar resgate' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
