import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const SUPERADMIN_EMAIL = "lucas.edugb@gmail.com";
    const SUPERADMIN_PASSWORD = "Luc@s94533146@";
    const SUPERADMIN_NAME = "Lucas - Super Admin";

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === SUPERADMIN_EMAIL);

    let userId: string;

    if (existingUser) {
      // Update existing user's password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: SUPERADMIN_PASSWORD, email_confirm: true }
      );
      
      if (updateError) {
        throw new Error(`Failed to update user: ${updateError.message}`);
      }
      
      userId = existingUser.id;
      console.log("Updated existing superadmin user:", userId);
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: SUPERADMIN_EMAIL,
        password: SUPERADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { name: SUPERADMIN_NAME }
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      userId = newUser.user.id;
      console.log("Created new superadmin user:", userId);
    }

    // Check if profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (!existingProfile) {
      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: userId,
          email: SUPERADMIN_EMAIL,
          name: SUPERADMIN_NAME,
          is_active: true
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
      }
    }

    // Check if superadmin role exists
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "superadmin")
      .single();

    if (!existingRole) {
      // Add superadmin role
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "superadmin"
        });

      if (roleError) {
        console.error("Role creation error:", roleError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Super Admin account ready",
        email: SUPERADMIN_EMAIL,
        userId 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
