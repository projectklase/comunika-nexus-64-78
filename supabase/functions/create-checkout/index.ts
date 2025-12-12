import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeamento de Price IDs do Stripe
const STRIPE_PRICES = {
  challenger: 'price_1SdKw2Cs06MIouz0ssyEXXVX',
  master: 'price_1SdfbbCs06MIouz0odRyeH8R',
  legend: 'price_1SdfckCs06MIouz0ofvMiJdk',
  escola_extra: 'price_1SdfjlCs06MIouz0FgdhhJnV',
  implantacao: 'price_1SdKvYCs06MIouz0hh4bSB1a'
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { priceType, quantity = 1 } = await req.json();
    logStep("Request params", { priceType, quantity });

    // Validate price type
    const priceId = STRIPE_PRICES[priceType as keyof typeof STRIPE_PRICES];
    if (!priceId) {
      throw new Error(`Invalid price type: ${priceType}`);
    }
    logStep("Price ID resolved", { priceId });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer, will create on checkout");
    }

    // Determine mode based on price type
    const isRecurring = priceType !== 'implantacao';
    const mode = isRecurring ? 'subscription' : 'payment';
    logStep("Checkout mode", { mode, isRecurring });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      mode: mode,
      success_url: `${req.headers.get("origin")}/admin/assinatura?success=true`,
      cancel_url: `${req.headers.get("origin")}/admin/assinatura?canceled=true`,
      metadata: {
        user_id: user.id,
        price_type: priceType,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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
