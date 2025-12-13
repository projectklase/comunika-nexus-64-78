import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyPasswordRequest {
  email: string;
  password: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json() as VerifyPasswordRequest;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Email e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying superadmin password for:', email);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Attempt to sign in with the provided credentials
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.user) {
      console.log('Sign in failed:', signInError?.message);
      return new Response(
        JSON.stringify({ valid: false, error: 'Senha inválida' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = signInData.user.id;

    // Verify the user is actually a superadmin
    const { data: isSuperAdmin, error: roleError } = await supabaseAdmin.rpc('is_superadmin', {
      uid: userId,
    });

    if (roleError) {
      console.error('Error checking superadmin status:', roleError);
      return new Response(
        JSON.stringify({ valid: false, error: 'Erro ao verificar permissões' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isSuperAdmin) {
      console.log('User is not a superadmin');
      return new Response(
        JSON.stringify({ valid: false, error: 'Usuário não é super admin' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Superadmin password verified successfully');

    // Sign out to clean up the session (we only wanted to verify, not create a session)
    await supabaseAdmin.auth.signOut();

    return new Response(
      JSON.stringify({ valid: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-superadmin-password:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
