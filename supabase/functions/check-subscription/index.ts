import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeamento de Product IDs para slugs de planos
const PRODUCT_TO_PLAN: Record<string, string> = {
  'prod_SjcZxH3Sl5Pz2R': 'challenger',
  'prod_SjtwQUDuwdAQXn': 'master',
  'prod_SjtxQVIxLfPUAk': 'legend',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Find customer in Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        plan_slug: null,
        subscription_end: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Customer found", { customerId });

    // Check for active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    let hasActiveSub = subscriptions.data.length > 0;
    let planSlug: string | null = null;
    let subscriptionEnd: string | null = null;
    let stripeSubscriptionId: string | null = null;
    let addonSchoolsCount = 0;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      stripeSubscriptionId = subscription.id;
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        endDate: subscriptionEnd 
      });

      // Analyze subscription items to determine plan and addons
      for (const item of subscription.items.data) {
        const productId = typeof item.price.product === 'string' 
          ? item.price.product 
          : item.price.product.id;
        
        // Check if it's a main plan
        if (PRODUCT_TO_PLAN[productId]) {
          planSlug = PRODUCT_TO_PLAN[productId];
          logStep("Plan identified", { productId, planSlug });
        }
        
        // Check if it's escola_extra (by price ID pattern or product check)
        if (item.price.id === 'price_1SdfjlCs06MIouz0FgdhhJnV') {
          addonSchoolsCount = item.quantity || 1;
          logStep("Addon schools found", { addonSchoolsCount });
        }
      }
    } else {
      logStep("No active subscription found");
    }

    const result = {
      subscribed: hasActiveSub,
      plan_slug: planSlug,
      subscription_end: subscriptionEnd,
      stripe_customer_id: customerId,
      stripe_subscription_id: stripeSubscriptionId,
      addon_schools_count: addonSchoolsCount,
    };

    logStep("Returning result", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
