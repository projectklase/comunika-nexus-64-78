import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateAdminRequest {
  // Dados do Admin
  name: string
  email: string
  password: string
  phone?: string
  
  // Dados da Escola
  school_name: string
  school_slug: string
  
  // Dados da Assinatura
  plan_id: string
  status: 'active' | 'trial' | 'pending_payment'
  trial_days?: number
  addon_schools_count?: number
  
  // Dados da Empresa (opcionais)
  company_name?: string
  company_cnpj?: string
  company_address?: string
  company_city?: string
  company_state?: string
  
  // Geração de link de pagamento
  generate_payment_link?: boolean
  include_implantation?: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Create administrator function called')
    
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
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Verificar se é superadmin
    const { data: isSuperAdmin } = await supabaseAdmin.rpc('is_superadmin', { _user_id: callerUser.id })
    
    if (!isSuperAdmin) {
      console.error('User is not superadmin:', callerUser.id)
      return new Response(
        JSON.stringify({ success: false, error: 'Apenas superadmins podem criar administradores' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const data: CreateAdminRequest = await req.json()
    console.log('Creating administrator:', data.email)

    // Validações
    if (!data.email || !data.password || !data.name || !data.school_name || !data.school_slug || !data.plan_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Todos os campos obrigatórios devem ser preenchidos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email inválido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validar senha (mínimo 8 caracteres)
    if (data.password.length < 8) {
      return new Response(
        JSON.stringify({ success: false, error: 'Senha deve ter no mínimo 8 caracteres' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validar slug (só letras, números e hífens)
    const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/
    if (!slugRegex.test(data.school_slug)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Slug inválido. Use apenas letras minúsculas, números e hífens.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Verificar se email já existe em auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingAuthUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === data.email.toLowerCase())
    
    if (existingAuthUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Este email já está cadastrado no sistema' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      )
    }

    // Verificar se email já existe em profiles
    const { data: existingProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', data.email.toLowerCase())
      .limit(1)

    if (existingProfiles && existingProfiles.length > 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Este email já está cadastrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      )
    }

    // Verificar se slug já existe
    const { data: existingSchool } = await supabaseAdmin
      .from('schools')
      .select('id')
      .eq('slug', data.school_slug)
      .limit(1)

    if (existingSchool && existingSchool.length > 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Este slug de escola já está em uso' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      )
    }

    // Verificar se plano existe
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('id', data.plan_id)
      .single()

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ success: false, error: 'Plano não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 1. Criar usuário no auth.users
    const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: {
        name: data.name,
        role: 'administrador',
        // Dados da empresa (opcionais)
        company_name: data.company_name || null,
        company_cnpj: data.company_cnpj || null,
        company_address: data.company_address || null,
        company_city: data.company_city || null,
        company_state: data.company_state || null,
      }
    })

    if (createUserError || !authUser.user) {
      console.error('Error creating user:', createUserError)
      return new Response(
        JSON.stringify({ success: false, error: createUserError?.message || 'Erro ao criar usuário' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const userId = authUser.user.id
    console.log('User created:', userId)

    // 2. Criar ou atualizar perfil (trigger on_auth_user_created pode já ter criado)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: data.email.toLowerCase(),
        name: data.name,
        phone: data.phone || null,
        is_active: true,
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // Cleanup: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao criar perfil' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 3. Inserir role 'administrador'
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'administrador'
      })

    if (roleError) {
      console.error('Error creating role:', roleError)
    }

    // 4. Criar escola
    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .insert({
        name: data.school_name,
        slug: data.school_slug,
        is_active: true,
      })
      .select()
      .single()

    if (schoolError || !school) {
      console.error('Error creating school:', schoolError)
      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao criar escola' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('School created:', school.id)

    // 5. Atualizar perfil com current_school_id
    await supabaseAdmin
      .from('profiles')
      .update({ current_school_id: school.id, default_school_slug: school.slug })
      .eq('id', userId)

    // 6. Criar school_membership
    const { error: membershipError } = await supabaseAdmin
      .from('school_memberships')
      .insert({
        user_id: userId,
        school_id: school.id,
        role: 'administrador',
        is_primary: true
      })

    if (membershipError) {
      console.error('Error creating membership:', membershipError)
    }

    // 7. Calcular datas de trial e expiração
    const now = new Date()
    let trialEndsAt: string | null = null
    let expiresAt: string | null = null

    if (data.status === 'trial' && data.trial_days) {
      const trialEnd = new Date(now)
      trialEnd.setDate(trialEnd.getDate() + data.trial_days)
      trialEndsAt = trialEnd.toISOString()
    }

    // 8. Criar assinatura com addon_schools_count
    // Se generate_payment_link é true, criar com pending_payment
    const finalStatus = data.generate_payment_link ? 'pending_payment' : data.status
    
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('admin_subscriptions')
      .insert({
        admin_id: userId,
        plan_id: data.plan_id,
        status: finalStatus,
        trial_ends_at: trialEndsAt,
        expires_at: expiresAt,
        addon_schools_count: data.addon_schools_count || 0,
        // Salvar senha temporária para o fluxo de link de pagamento
        temp_password: data.generate_payment_link ? data.password : null,
      })
      .select()
      .single()

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError)
      // Continue anyway - subscription can be added later
    }

    // 9. Gerar link de pagamento se solicitado
    let paymentUrl: string | null = null
    if (data.generate_payment_link) {
      console.log('Generating Stripe payment link for admin:', userId)
      
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-payment-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          planSlug: plan.slug,
          addonSchools: data.addon_schools_count || 0,
          customerEmail: data.email.toLowerCase(),
          adminId: userId,
          adminName: data.name,
          schoolName: data.school_name,
          includeImplantation: data.include_implantation || false,
        }),
      })
      
      const paymentResult = await response.json()
      if (paymentResult.success && paymentResult.paymentUrl) {
        paymentUrl = paymentResult.paymentUrl
        console.log('Payment link generated:', paymentUrl)
      } else {
        console.error('Failed to generate payment link:', paymentResult.error)
      }
    }

    // 10. Calcular valor total para audit log
    const addonCost = (data.addon_schools_count || 0) * 49700; // R$497 em centavos
    const totalMonthlyCents = plan.price_cents + addonCost;

    // 11. Registrar no audit log com dados completos
    await supabaseAdmin
      .from('platform_audit_logs')
      .insert({
        superadmin_id: callerUser.id,
        action: 'CREATE_ADMINISTRATOR',
        entity_type: 'administrator',
        entity_id: userId,
        entity_label: data.name,
        details: {
          email: data.email,
          phone: data.phone || null,
          school_name: data.school_name,
          school_slug: data.school_slug,
          plan_name: plan.name,
          plan_price_cents: plan.price_cents,
          addon_schools_count: data.addon_schools_count || 0,
          addon_cost_cents: addonCost,
          total_monthly_cents: totalMonthlyCents,
          status: finalStatus,
          trial_days: data.trial_days || null,
          generate_payment_link: data.generate_payment_link || false,
          include_implantation: data.include_implantation || false,
          payment_url_generated: !!paymentUrl,
          // Dados da empresa
          company_name: data.company_name || null,
          company_cnpj: data.company_cnpj || null,
          company_address: data.company_address || null,
          company_city: data.company_city || null,
          company_state: data.company_state || null,
        }
      })

    console.log('Administrator created successfully:', userId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        admin: {
          id: userId,
          name: data.name,
          email: data.email,
          phone: data.phone || null,
        },
        school: {
          id: school.id,
          name: school.name,
          slug: school.slug,
        },
        subscription: subscription || null,
        plan: {
          id: plan.id,
          name: plan.name,
          price_cents: plan.price_cents,
          max_students: plan.max_students,
          included_schools: plan.included_schools,
        },
        billing: {
          addon_schools_count: data.addon_schools_count || 0,
          addon_cost_cents: addonCost,
          total_monthly_cents: totalMonthlyCents,
        },
        company: data.company_name ? {
          name: data.company_name,
          cnpj: data.company_cnpj || null,
          address: data.company_address || null,
          city: data.company_city || null,
          state: data.company_state || null,
        } : null,
        // Novo campo para link de pagamento
        payment_url: paymentUrl,
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
