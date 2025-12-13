import Stripe from 'https://esm.sh/stripe@18.5.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mapeamento de planos para Price IDs do Stripe
const PLAN_TO_PRICE: Record<string, string> = {
  'challenger': 'price_1SdKw2Cs06MIouz0ssyEXXVX',
  'master': 'price_1SdfbbCs06MIouz0odRyeH8R',
  'legend': 'price_1SdfckCs06MIouz0ofvMiJdk',
}

const ADDON_SCHOOL_PRICE = 'price_1SdfjlCs06MIouz0FgdhhJnV'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[GENERATE-PAYMENT-LINK] Function started')

    const { 
      planSlug, 
      addonSchools = 0, 
      customerEmail, 
      adminId,
      adminName,
      schoolName,
    } = await req.json()

    // Validações
    if (!planSlug || !customerEmail || !adminId) {
      return new Response(
        JSON.stringify({ success: false, error: 'planSlug, customerEmail e adminId são obrigatórios' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const priceId = PLAN_TO_PRICE[planSlug]
    if (!priceId) {
      return new Response(
        JSON.stringify({ success: false, error: `Plano inválido: ${planSlug}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('[GENERATE-PAYMENT-LINK] Params:', { planSlug, addonSchools, customerEmail, adminId })

    // Inicializar Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    })

    // Montar line_items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: priceId,
        quantity: 1,
      }
    ]

    // Adicionar escolas extras se houver
    if (addonSchools > 0) {
      lineItems.push({
        price: ADDON_SCHOOL_PRICE,
        quantity: addonSchools,
      })
    }

    // URLs de retorno
    const origin = 'https://app.klasetech.com'
    const successUrl = `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&admin_id=${adminId}`
    const cancelUrl = `${origin}/payment-canceled`

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      customer_email: customerEmail,
      line_items: lineItems,
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: adminId,
        admin_id: adminId,
        plan_slug: planSlug,
        addon_schools_count: String(addonSchools),
        admin_name: adminName || '',
        school_name: schoolName || '',
        source: 'superadmin_manual_creation',
      },
      subscription_data: {
        metadata: {
          admin_id: adminId,
          plan_slug: planSlug,
          addon_schools_count: String(addonSchools),
        }
      }
    })

    console.log('[GENERATE-PAYMENT-LINK] Session created:', session.id, session.url)

    return new Response(
      JSON.stringify({ 
        success: true, 
        paymentUrl: session.url,
        sessionId: session.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar link de pagamento'
    console.error('[GENERATE-PAYMENT-LINK] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
