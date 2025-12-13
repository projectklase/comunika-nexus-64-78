import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@18.5.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Map Stripe Product IDs to plan slugs (unified with check-subscription)
const PRODUCT_TO_PLAN: Record<string, string> = {
  'prod_SjcZxH3Sl5Pz2R': 'challenger',
  'prod_SjtwQUDuwdAQXn': 'master',
  'prod_SjtxQVIxLfPUAk': 'legend',
}

// Price ID for addon schools
const ADDON_SCHOOL_PRICE_ID = 'price_1SdfjlCs06MIouz0FgdhhJnV'

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : ''
  console.log(`[SYNC-SUBSCRIPTION] ${step}${detailsStr}`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    logStep('Function started')

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY is not set')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    logStep('User authenticated', { userId: user.id, email: user.email })

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' })

    // Find Stripe customer by email
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 })
    
    if (customers.data.length === 0) {
      logStep('No Stripe customer found')
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhum cliente Stripe encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    const customerId = customers.data[0].id
    logStep('Found Stripe customer', { customerId })

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    })

    if (subscriptions.data.length === 0) {
      logStep('No active subscription found')
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhuma assinatura ativa encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    const stripeSubscription = subscriptions.data[0]
    
    // Analyze subscription items to determine plan and addon schools
    let planSlug = 'challenger'
    let addonSchoolsCount = 0
    
    for (const item of stripeSubscription.items.data) {
      const productId = typeof item.price.product === 'string' 
        ? item.price.product 
        : (item.price.product as any).id
      
      // Check if it's a main plan
      if (PRODUCT_TO_PLAN[productId]) {
        planSlug = PRODUCT_TO_PLAN[productId]
        logStep('Plan identified', { productId, planSlug })
      }
      
      // Check if it's addon schools
      if (item.price.id === ADDON_SCHOOL_PRICE_ID) {
        addonSchoolsCount = item.quantity || 1
        logStep('Addon schools found', { addonSchoolsCount })
      }
    }
    
    logStep('Active subscription found', { 
      subscriptionId: stripeSubscription.id, 
      planSlug,
      addonSchoolsCount
    })

    // Get plan_id from subscription_plans
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('id')
      .eq('slug', planSlug)
      .single()

    if (planError || !plan) {
      logStep('Plan not found', { planSlug, error: planError })
      return new Response(
        JSON.stringify({ success: false, error: 'Plano não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Update admin_subscriptions
    const { data: subscription, error: updateError } = await supabaseAdmin
      .from('admin_subscriptions')
      .update({
        plan_id: plan.id,
        status: 'active',
        stripe_customer_id: customerId,
        stripe_subscription_id: stripeSubscription.id,
        addon_schools_count: addonSchoolsCount,
        updated_at: new Date().toISOString(),
      })
      .eq('admin_id', user.id)
      .select()
      .single()

    if (updateError) {
      logStep('Error updating subscription', { error: updateError })
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao atualizar assinatura' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    logStep('Subscription synced successfully', { 
      subscriptionId: subscription.id,
      planSlug,
      addonSchoolsCount,
      stripeSubscriptionId: stripeSubscription.id 
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        subscription: {
          id: subscription.id,
          plan_slug: planSlug,
          status: 'active',
          addon_schools_count: addonSchoolsCount,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logStep('Function error', { error: errorMessage })
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
