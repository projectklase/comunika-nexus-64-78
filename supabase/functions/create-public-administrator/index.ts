import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreatePublicAdminRequest {
  // Dados do Admin
  name: string
  email: string
  password: string
  phone?: string
  
  // Dados da Escola
  school_name: string
  
  // Dados Fiscais (obrigatórios)
  company_name: string
  company_cnpj: string
  company_address: string
  company_number: string
  company_neighborhood: string
  company_zipcode: string
  company_city: string
  company_state: string
  company_state_registration?: string
  
  // Plano escolhido
  plan_id: string
}

function generateSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
  
  // Add random suffix to ensure uniqueness
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${baseSlug}-${randomSuffix}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Create public administrator function called')
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const data: CreatePublicAdminRequest = await req.json()
    console.log('Creating public administrator:', data.email)

    // Validações obrigatórias
    const requiredFields = [
      'name', 'email', 'password', 'school_name', 'plan_id',
      'company_name', 'company_cnpj', 'company_address', 'company_number',
      'company_neighborhood', 'company_zipcode', 'company_city', 'company_state'
    ]
    
    for (const field of requiredFields) {
      if (!data[field as keyof CreatePublicAdminRequest]) {
        return new Response(
          JSON.stringify({ success: false, error: `Campo obrigatório ausente: ${field}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
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

    // Validar CNPJ (14 dígitos)
    const cnpjNumbers = data.company_cnpj.replace(/\D/g, '')
    if (cnpjNumbers.length !== 14) {
      return new Response(
        JSON.stringify({ success: false, error: 'CNPJ deve ter 14 dígitos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validar CEP (8 dígitos)
    const cepNumbers = data.company_zipcode.replace(/\D/g, '')
    if (cepNumbers.length !== 8) {
      return new Response(
        JSON.stringify({ success: false, error: 'CEP deve ter 8 dígitos' }),
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

    // Gerar slug único para escola
    const schoolSlug = generateSlug(data.school_name)

    // 1. Criar usuário no auth.users
    const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: {
        name: data.name,
        role: 'administrador',
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

    // 2. Criar perfil
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
        slug: schoolSlug,
        is_active: true,
      })
      .select()
      .single()

    if (schoolError || !school) {
      console.error('Error creating school:', schoolError)
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

    // 7. Criar assinatura com status pending_payment
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('admin_subscriptions')
      .insert({
        admin_id: userId,
        plan_id: data.plan_id,
        status: 'pending_payment',
        addon_schools_count: 0,
      })
      .select()
      .single()

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError)
    }

    // 8. Criar billing_info com dados fiscais
    const { error: billingError } = await supabaseAdmin
      .from('billing_info')
      .insert({
        admin_id: userId,
        company_name: data.company_name,
        company_cnpj: cnpjNumbers,
        company_address: data.company_address,
        company_number: data.company_number,
        company_neighborhood: data.company_neighborhood,
        company_zipcode: cepNumbers,
        company_city: data.company_city,
        company_state: data.company_state,
        company_state_registration: data.company_state_registration || null,
      })

    if (billingError) {
      console.error('Error creating billing info:', billingError)
    }

    // 9. Registrar no audit log
    await supabaseAdmin
      .from('platform_audit_logs')
      .insert({
        superadmin_id: userId, // Self-registration
        action: 'SELF_REGISTER_ADMINISTRATOR',
        entity_type: 'administrator',
        entity_id: userId,
        entity_label: data.name,
        details: {
          email: data.email,
          phone: data.phone || null,
          school_name: data.school_name,
          school_slug: schoolSlug,
          plan_name: plan.name,
          plan_price_cents: plan.price_cents,
          company_name: data.company_name,
          company_cnpj: cnpjNumbers,
          company_city: data.company_city,
          company_state: data.company_state,
          created_via: 'self_registration',
        }
      })

    console.log('Public administrator created successfully:', userId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        admin: {
          id: userId,
          name: data.name,
          email: data.email,
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
          slug: plan.slug,
          price_cents: plan.price_cents,
          max_students: plan.max_students,
        },
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