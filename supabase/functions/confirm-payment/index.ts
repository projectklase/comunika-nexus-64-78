import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@18.5.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mapeamento de Product IDs para plan slugs
const PRODUCT_TO_PLAN: Record<string, string> = {
  'prod_SjfgCfdfqyq1hL': 'challenger',
  'prod_SkBjOXDN8WdyJz': 'master',
  'prod_SkBk5Lq3xzT5sP': 'legend',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Confirm payment function called')
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { session_id } = await req.json()

    if (!session_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Session ID obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Inicializar Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    })

    // Verificar sessão do Stripe
    console.log('Retrieving Stripe session:', session_id)
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription', 'subscription.items.data.price.product']
    })

    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ success: false, error: 'Pagamento não confirmado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get user_id from metadata
    const userId = session.metadata?.user_id
    if (!userId) {
      console.error('No user_id in session metadata')
      return new Response(
        JSON.stringify({ success: false, error: 'User ID não encontrado na sessão' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Payment confirmed for user:', userId)

    // Determine plan from subscription
    let planSlug = 'challenger'
    const subscription = session.subscription as any
    if (subscription?.items?.data) {
      for (const item of subscription.items.data) {
        const productId = typeof item.price.product === 'string' 
          ? item.price.product 
          : item.price.product?.id
        
        if (productId && PRODUCT_TO_PLAN[productId]) {
          planSlug = PRODUCT_TO_PLAN[productId]
          break
        }
      }
    }

    console.log('Determined plan slug:', planSlug)

    // Get plan_id from slug
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('id, name, max_students')
      .eq('slug', planSlug)
      .single()

    if (planError || !plan) {
      console.error('Plan not found for slug:', planSlug, planError)
    }

    // Update subscription to active
    const { data: subscriptionData, error: updateError } = await supabaseAdmin
      .from('admin_subscriptions')
      .update({
        status: 'active',
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: typeof session.subscription === 'string' 
          ? session.subscription 
          : (session.subscription as any)?.id,
        plan_id: plan?.id,
      })
      .eq('admin_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao atualizar assinatura' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log('Subscription updated successfully')

    // Buscar dados para email de boas-vindas
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name, email')
      .eq('id', userId)
      .single()

    const { data: schoolMembership } = await supabaseAdmin
      .from('school_memberships')
      .select('school_id')
      .eq('user_id', userId)
      .eq('role', 'administrador')
      .single()

    let schoolData = null
    if (schoolMembership?.school_id) {
      const { data: school } = await supabaseAdmin
        .from('schools')
        .select('name, slug')
        .eq('id', schoolMembership.school_id)
        .single()
      schoolData = school
    }

    // Enviar email de confirmação de pagamento (sem senha - usuário já sabe)
    if (profile) {
      try {
        console.log('Sending payment confirmation email to:', profile.email)
        await supabaseAdmin.functions.invoke('send-admin-welcome-email', {
          body: {
            adminName: profile.name,
            adminEmail: profile.email,
            schoolName: schoolData?.name,
            planName: plan?.name,
            maxStudents: plan?.max_students,
            isPaymentConfirmation: true,
          }
        })
        console.log('Payment confirmation email sent')
      } catch (emailError) {
        console.error('Failed to send payment confirmation email:', emailError)
        // Don't fail the whole operation if email fails
      }
    }

    // Log de auditoria
    await supabaseAdmin
      .from('platform_audit_logs')
      .insert({
        superadmin_id: userId,
        action: 'PAYMENT_CONFIRMED',
        entity_type: 'subscription',
        entity_id: subscriptionData?.id,
        entity_label: profile?.name || profile?.email,
        details: {
          stripe_session_id: session_id,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          plan_slug: planSlug,
        }
      })

    console.log('Payment confirmation complete')

    return new Response(
      JSON.stringify({ 
        success: true,
        subscription: {
          id: subscriptionData?.id,
          status: 'active',
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
