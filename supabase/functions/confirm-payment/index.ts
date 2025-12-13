import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@18.5.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // Verificar autenticação
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
    const session = await stripe.checkout.sessions.retrieve(session_id)

    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ success: false, error: 'Pagamento não confirmado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Atualizar subscription para active
    const { data: subscription, error: updateError } = await supabaseAdmin
      .from('admin_subscriptions')
      .update({
        status: 'active',
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
      })
      .eq('admin_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao atualizar assinatura' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Buscar dados para email de boas-vindas
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name, email')
      .eq('id', user.id)
      .single()

    const { data: school } = await supabaseAdmin
      .from('schools')
      .select('name, slug')
      .eq('id', (await supabaseAdmin.from('school_memberships').select('school_id').eq('user_id', user.id).single()).data?.school_id)
      .single()

    const { data: plan } = await supabaseAdmin
      .from('subscription_plans')
      .select('name, max_students')
      .eq('id', subscription.plan_id)
      .single()

    // Enviar email de boas-vindas (sem senha - usuário já sabe)
    if (profile && school && plan) {
      try {
        await supabaseAdmin.functions.invoke('send-admin-welcome-email', {
          body: {
            adminName: profile.name,
            adminEmail: profile.email,
            schoolName: school.name,
            planName: plan.name,
            maxStudents: plan.max_students,
            isPaymentConfirmation: true, // Flag para template diferente
          }
        })
        console.log('Welcome email sent')
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError)
      }
    }

    // Log de auditoria
    await supabaseAdmin
      .from('platform_audit_logs')
      .insert({
        superadmin_id: user.id,
        action: 'PAYMENT_CONFIRMED',
        entity_type: 'subscription',
        entity_id: subscription.id,
        entity_label: profile?.name || user.email,
        details: {
          stripe_session_id: session_id,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          plan_id: subscription.plan_id,
        }
      })

    console.log('Payment confirmed for user:', user.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        subscription: {
          id: subscription.id,
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