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

    const { email, password, name, role }: DemoUserRequest = await req.json()

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