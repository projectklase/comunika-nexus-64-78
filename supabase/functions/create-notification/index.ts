import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  user_id: string
  type: string
  title: string
  message: string
  link?: string
  role_target?: string
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

    const notificationData: NotificationRequest = await req.json()

    // Validar campos obrigatórios
    if (!notificationData.user_id || !notificationData.type || !notificationData.title || !notificationData.message) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: user_id, type, title, message' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
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
