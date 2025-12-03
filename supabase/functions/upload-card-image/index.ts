import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { card_id, image_url } = await req.json();

    if (!card_id) {
      return new Response(
        JSON.stringify({ error: 'card_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!image_url) {
      return new Response(
        JSON.stringify({ error: 'image_url é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update card with image URL
    const { data, error } = await supabase
      .from('cards')
      .update({ image_url, updated_at: new Date().toISOString() })
      .eq('id', card_id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar carta:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar carta', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Carta ${data.name} atualizada com imagem: ${image_url}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        card: {
          id: data.id,
          name: data.name,
          image_url: data.image_url
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Erro:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
