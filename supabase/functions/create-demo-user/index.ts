import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DemoUserRequest {
  email?: string
  password?: string
  name?: string
  role?: string
  dob?: string
  phone?: string
  enrollment_number?: string
  student_notes?: string
  userId?: string // Para atualizar senha de usuário existente
  updatePasswordOnly?: boolean // Flag para indicar que é apenas update de senha
  school_id?: string // ✅ NOVO: ID da escola para vincular o usuário
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

    // Verificar se o usuário tem role de secretaria ou administrador
    const { data: userRoles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .single()

    if (roleError || !userRoles || !['secretaria', 'administrador'].includes(userRoles.role)) {
      console.error('User does not have secretaria or administrador role:', callerUser.id)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Apenas usuários da secretaria ou administradores podem criar logins' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      )
    }

    const callerRole = userRoles.role
    console.log('Caller role:', callerRole)

    const { email, password, name, role, dob, phone, enrollment_number, student_notes, userId, updatePasswordOnly, school_id }: DemoUserRequest = await req.json()
    
    // ✅ Log do school_id recebido
    console.log('School ID received:', school_id)

    // Se é apenas para atualizar senha
    if (updatePasswordOnly && userId) {
      if (!password || password.length < 6) {
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

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password }
      )

      if (updateError) {
        console.error('Error updating password:', updateError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: updateError.message 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      console.log('Password updated successfully for user:', userId)
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Senha atualizada com sucesso'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Validações de entrada para criação de usuário
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

    // ✅ VALIDAÇÃO: Verificar CPF duplicado (se fornecido)
    if (student_notes) {
      try {
        const notesData = JSON.parse(student_notes);
        if (notesData.document) {
          const { data: existingCPF } = await supabaseAdmin
            .from('profiles')
            .select('id, name, email, student_notes')
            .eq('current_school_id', school_id)
            .neq('id', '00000000-0000-0000-0000-000000000000');

          if (existingCPF) {
            // Buscar manualmente por CPF no student_notes
            const cpfDuplicate = existingCPF.find(p => {
              if (!p.student_notes) return false;
              try {
                const notes = typeof p.student_notes === 'string' 
                  ? JSON.parse(p.student_notes) 
                  : p.student_notes;
                return notes?.document === notesData.document;
              } catch {
                return false;
              }
            });

            if (cpfDuplicate) {
              console.error('Duplicate CPF found:', notesData.document);
              return new Response(
                JSON.stringify({ 
                  success: false, 
                  error: `CPF já cadastrado para ${cpfDuplicate.name} (${cpfDuplicate.email})` 
                }),
                { 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 409 
                }
              );
            }
          }
        }
      } catch (error) {
        console.error('Error parsing student_notes:', error);
      }
    }

    // ✅ VALIDAÇÃO: Verificar matrícula duplicada (se fornecida)
    if (enrollment_number && role === 'aluno' && school_id) {
      const { data: existingEnrollment } = await supabaseAdmin
        .from('profiles')
        .select('id, name, email')
        .eq('enrollment_number', enrollment_number)
        .eq('current_school_id', school_id)
        .maybeSingle();

      if (existingEnrollment) {
        console.error('Duplicate enrollment number:', enrollment_number);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Matrícula ${enrollment_number} já cadastrada para ${existingEnrollment.name} (${existingEnrollment.email})` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409 
          }
        );
      }
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

    // CRITICAL: Only administrators can create 'secretaria' role users
    if (role === 'secretaria' && callerRole !== 'administrador') {
      console.error('Only administrators can create secretaria users. Caller:', callerRole)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Apenas administradores podem criar usuários com papel de secretaria' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
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

    // Criar ou atualizar o perfil na tabela profiles com todos os dados
    const profileData: any = {
      id: data.user.id,
      email: email,
      name: name,
      is_active: true,
      current_school_id: school_id || null
    }

    // Adicionar campos opcionais se fornecidos
    if (dob) profileData.dob = dob
    if (phone) profileData.phone = phone
    if (enrollment_number) profileData.enrollment_number = enrollment_number
    if (student_notes) profileData.student_notes = student_notes

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // Não falhar completamente, mas avisar
    }

    // CORREÇÃO 1: Removida inserção duplicada de role
    // O trigger handle_new_user_role já cria a role automaticamente
    console.log('User role will be created automatically by trigger handle_new_user_role')

    // ✅ VINCULAR À ESCOLA via school_memberships (professor, secretaria, aluno)
    if (school_id) {
      console.log(`📝 Verificando vínculo school_membership para ${role}:`, school_id)
      
      // Verificar se já existe registro para este usuário nesta escola
      const { data: existingMembership } = await supabaseAdmin
        .from('school_memberships')
        .select('id')
        .eq('user_id', data.user.id)
        .eq('school_id', school_id)
        .eq('role', role)
        .single()

      if (!existingMembership) {
        console.log(`📝 Criando vínculo school_membership para ${role}:`, school_id)
        
        const { error: membershipError } = await supabaseAdmin
          .from('school_memberships')
          .insert({
            user_id: data.user.id,
            school_id: school_id,
            role: role,
            is_primary: true
          })

        if (membershipError) {
          console.error('❌ Erro ao criar school_membership:', membershipError)
          throw new Error(`Erro ao vincular ${role} à escola: ${membershipError.message}`)
        }
        
        console.log(`✅ ${role} vinculado à escola com sucesso`)
      } else {
        console.log(`ℹ️ ${role} já possui vínculo com esta escola`)
      }
    } else {
      console.warn(`⚠️ Nenhum school_id fornecido, ${role} criado sem vínculo de escola`)
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