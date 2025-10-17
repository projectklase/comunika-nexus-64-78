import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  user_id?: string
  userId?: string  // Aceitar camelCase também
  type: string
  title: string
  message: string
  link?: string
  role_target?: string
  roleTarget?: string  // Aceitar camelCase também
  meta?: any
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestData: NotificationRequest = await req.json()

    // Normalizar campos (aceitar tanto snake_case quanto camelCase)
    const user_id = requestData.user_id || requestData.userId
    const role_target = requestData.role_target || requestData.roleTarget

    // Validar campos obrigatórios
    if (!user_id || !requestData.type || !requestData.title || !requestData.message) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: user_id/userId, type, title, message' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Montar objeto de notificação normalizado
    const notificationData = {
      user_id,
      type: requestData.type,
      title: requestData.title,
      message: requestData.message,
      link: requestData.link,
      role_target,
      meta: requestData.meta
    }

    // Inserir notificação usando service role (bypassa RLS)
    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(notificationData)

    if (insertError) {
      console.error('Error inserting notification:', insertError)
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
