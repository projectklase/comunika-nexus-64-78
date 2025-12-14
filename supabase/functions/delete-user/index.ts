import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteUserRequest {
  userId: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Delete user function called')
    
    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId }: DeleteUserRequest = await req.json()

    if (!userId) {
      console.error('Missing userId parameter')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'userId é obrigatório' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    console.log(`Deleting user: ${userId}`)

    // 1. Buscar escolas onde o admin é membro como administrador
    const { data: adminSchools, error: fetchError } = await supabaseAdmin
      .from('school_memberships')
      .select('school_id')
      .eq('user_id', userId)
      .eq('role', 'administrador')

    if (fetchError) {
      console.error('Error fetching admin schools:', fetchError)
    }

    // 2. Deletar as escolas do admin (ON DELETE CASCADE cuida do resto)
    if (adminSchools && adminSchools.length > 0) {
      const schoolIds = adminSchools.map(s => s.school_id)
      console.log(`Deleting ${schoolIds.length} schools for admin ${userId}:`, schoolIds)

      const { error: deleteSchoolsError } = await supabaseAdmin
        .from('schools')
        .delete()
        .in('id', schoolIds)

      if (deleteSchoolsError) {
        console.error('Error deleting schools:', deleteSchoolsError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Erro ao deletar escolas do administrador: ' + deleteSchoolsError.message 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      console.log(`Successfully deleted ${schoolIds.length} schools`)
    }

    // 3. Deletar o usuário do auth.users (cascade deleta profiles, school_memberships restantes)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      console.error('Error deleting user:', error)
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

    console.log('User deleted successfully:', userId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuário deletado com sucesso' 
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
        error: 'Erro interno do servidor' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
