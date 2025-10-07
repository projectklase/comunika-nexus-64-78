import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DemoUserRequest {
  email: string
  password: string
  name: string
  role: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Create demo user function called')
    
    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // SEGURANÇA: Verificar se quem está chamando tem role de secretaria
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Missing authorization header')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Não autorizado' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    // Obter o usuário que está fazendo a requisição
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !callerUser) {
      console.error('Invalid token:', authError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token inválido' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    // Verificar se o usuário tem role de secretaria
    const { data: userRoles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .eq('role', 'secretaria')
      .single()

    if (roleError || !userRoles) {
      console.error('User does not have secretaria role:', callerUser.id)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Apenas usuários da secretaria podem criar logins' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      )
    }

    const { email, password, name, role }: DemoUserRequest = await req.json()

    // Validações de entrada
    if (!email || !password || !name || !role) {
      console.error('Missing required fields')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email, senha, nome e role são obrigatórios' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.error('Invalid email format:', email)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email inválido' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Validar comprimento do nome
    if (name.length < 3 || name.length > 100) {
      console.error('Invalid name length:', name.length)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nome deve ter entre 3 e 100 caracteres' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Validar senha
    if (password.length < 6) {
      console.error('Password too short')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Senha deve ter no mínimo 6 caracteres' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Validar role
    const validRoles = ['secretaria', 'professor', 'aluno']
    if (!validRoles.includes(role)) {
      console.error('Invalid role:', role)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Role inválida' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    console.log(`Creating demo user: ${email} with role: ${role}`)

    // Create the user with admin privileges
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        role,
      }
    })

    if (error) {
      // If user already exists, that's fine - return success
      if (error.message?.includes('already') || error.message?.includes('exists') || error.message?.includes('User already registered')) {
        console.log('User already exists, returning success')
        return new Response(
          JSON.stringify({ 
            success: true, 
            user: { email },
            message: 'User already exists'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }
      
      console.error('Error creating demo user:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    console.log('Demo user created successfully:', data.user?.email)

    // Criar entrada na tabela user_roles
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: data.user.id,
        role: role
      })

    if (roleInsertError) {
      console.error('Error creating user role:', roleInsertError)
      // Não falhar a operação por isso, pois o trigger deve ter criado
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: data.user 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})