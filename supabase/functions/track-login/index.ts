import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verificar usuário autenticado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('[track-login] Auth error:', userError);
      throw new Error('Usuário não autenticado');
    }

    // Buscar role do usuário
    const { data: userRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole) {
      console.error('[track-login] Role error:', roleError);
      throw new Error('Role não encontrada para o usuário');
    }

    // Extrair informações do request
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    console.log('[track-login] Recording login for user:', user.id, 'role:', userRole.role);

    // Inserir registro de login
    const { error: insertError } = await supabaseClient
      .from('login_history')
      .insert({
        user_id: user.id,
        profile_id: user.id,
        user_role: userRole.role,
        logged_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        session_id: crypto.randomUUID()
      });

    if (insertError) {
      console.error('[track-login] Insert error:', insertError);
      throw insertError;
    }

    console.log('[track-login] ✅ Login recorded successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Login registrado com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[track-login] ❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
