import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SCHOOL-AFTER-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Initialize Supabase Admin client (service_role to bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { school_name, school_slug } = await req.json();
    
    if (!school_name || !school_slug) {
      throw new Error("school_name and school_slug are required");
    }
    logStep("School data received", { school_name, school_slug });

    // Check if school with slug already exists
    const { data: existingSchool } = await supabaseAdmin
      .from('schools')
      .select('id')
      .eq('slug', school_slug)
      .maybeSingle();

    if (existingSchool) {
      logStep("School already exists", { schoolId: existingSchool.id });
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "School already exists",
          school_id: existingSchool.id 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Create school using service role (bypasses RLS)
    const { data: newSchool, error: schoolError } = await supabaseAdmin
      .from('schools')
      .insert({
        name: school_name,
        slug: school_slug,
        is_active: true,
      })
      .select()
      .single();

    if (schoolError) {
      logStep("Error creating school", { error: schoolError.message });
      throw new Error(`Failed to create school: ${schoolError.message}`);
    }
    logStep("School created", { schoolId: newSchool.id });

    // Create school_membership for the admin
    const { error: membershipError } = await supabaseAdmin
      .from('school_memberships')
      .insert({
        user_id: user.id,
        school_id: newSchool.id,
        role: 'administrador',
        is_primary: false, // Additional schools are not primary
      });

    if (membershipError) {
      logStep("Error creating membership", { error: membershipError.message });
      // Try to clean up the school if membership fails
      await supabaseAdmin.from('schools').delete().eq('id', newSchool.id);
      throw new Error(`Failed to create school membership: ${membershipError.message}`);
    }
    logStep("School membership created");

    // Log to audit trail
    await supabaseAdmin.from('platform_audit_logs').insert({
      superadmin_id: null,
      action: 'SCHOOL_CREATED_AFTER_PAYMENT',
      entity_type: 'school',
      entity_id: newSchool.id,
      entity_label: school_name,
      details: {
        admin_id: user.id,
        admin_email: user.email,
        school_slug: school_slug,
      },
    });
    logStep("Audit log created");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "School created successfully",
        school_id: newSchool.id,
        school_name: newSchool.name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
