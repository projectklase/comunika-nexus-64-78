import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-STRIPE-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify superadmin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { email: user.email });

    // Verify superadmin role
    const { data: isSuperAdmin } = await supabaseClient.rpc('is_superadmin');
    if (!isSuperAdmin) {
      throw new Error("Acesso negado: apenas Super Admin pode cancelar assinaturas");
    }
    logStep("Superadmin verified");

    // Get admin_id from request body
    const { admin_id } = await req.json();
    if (!admin_id) throw new Error("admin_id is required");
    logStep("Processing cancellation for admin", { admin_id });

    // Get subscription info from database
    const { data: subscription, error: subError } = await supabaseClient
      .from('admin_subscriptions')
      .select('stripe_subscription_id, status')
      .eq('admin_id', admin_id)
      .single();

    if (subError || !subscription) {
      throw new Error("Assinatura não encontrada para este administrador");
    }
    logStep("Subscription found", { 
      stripe_subscription_id: subscription.stripe_subscription_id,
      current_status: subscription.status 
    });

    // Check if already canceled
    if (subscription.status === 'canceled') {
      throw new Error("Esta assinatura já está cancelada");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Cancel in Stripe if there's a subscription ID
    if (subscription.stripe_subscription_id) {
      logStep("Canceling Stripe subscription", { id: subscription.stripe_subscription_id });
      
      try {
        await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
        logStep("Stripe subscription canceled successfully");
      } catch (stripeError: any) {
        // If subscription doesn't exist in Stripe, continue with local update
        if (stripeError.code === 'resource_missing') {
          logStep("Stripe subscription not found, continuing with local update");
        } else {
          throw new Error(`Erro ao cancelar no Stripe: ${stripeError.message}`);
        }
      }
    } else {
      logStep("No Stripe subscription ID found, updating local status only");
    }

    // Update status in Supabase
    const { error: updateError } = await supabaseClient
      .from('admin_subscriptions')
      .update({ 
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('admin_id', admin_id);

    if (updateError) {
      throw new Error(`Erro ao atualizar status: ${updateError.message}`);
    }
    logStep("Local subscription status updated to canceled");

    // Get admin info for audit log
    const { data: adminProfile } = await supabaseClient
      .from('profiles')
      .select('name, email')
      .eq('id', admin_id)
      .single();

    // Log to audit trail
    const { error: auditError } = await supabaseClient
      .from('platform_audit_logs')
      .insert({
        superadmin_id: user.id,
        action: 'cancel_subscription',
        entity_type: 'subscription',
        entity_id: admin_id,
        entity_label: adminProfile?.name || adminProfile?.email || admin_id,
        details: {
          stripe_subscription_id: subscription.stripe_subscription_id,
          previous_status: subscription.status,
          canceled_by: user.email
        }
      });

    if (auditError) {
      logStep("Warning: Failed to log audit event", { error: auditError.message });
    } else {
      logStep("Audit log created");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Assinatura cancelada com sucesso" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
