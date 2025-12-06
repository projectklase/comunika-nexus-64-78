import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create regular client to verify caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify superadmin role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'superadmin')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Superadmin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { adminId, newPassword, sendEmail } = await req.json();

    if (!adminId) {
      return new Response(
        JSON.stringify({ error: 'adminId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin info for logging
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('email, name')
      .eq('id', adminId)
      .single();

    let result;

    if (newPassword) {
      // Direct password reset
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(adminId, {
        password: newPassword,
      });

      if (error) {
        console.error('Password reset error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      result = { success: true, method: 'direct_reset' };
    } else if (sendEmail && adminProfile?.email) {
      // Send password reset email
      const { error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: adminProfile.email,
      });

      if (error) {
        console.error('Email generation error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      result = { success: true, method: 'email_sent' };
    } else {
      return new Response(
        JSON.stringify({ error: 'Either newPassword or sendEmail must be provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the action
    await supabaseAdmin.from('platform_audit_logs').insert({
      superadmin_id: user.id,
      action: 'PASSWORD_RESET',
      entity_type: 'admin',
      entity_id: adminId,
      entity_label: adminProfile?.email || adminId,
      details: { 
        method: result.method,
        admin_name: adminProfile?.name,
      },
    });

    console.log(`Password reset for admin ${adminId} by superadmin ${user.id}`);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
