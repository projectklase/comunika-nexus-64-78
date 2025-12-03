import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { card_id, image_base64, filename } = await req.json();

    if (!card_id || !image_base64) {
      return new Response(
        JSON.stringify({ success: false, error: 'card_id e image_base64 são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[upload-card-image] Processando upload para carta: ${card_id}`);

    // Verificar se a carta existe
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('id, name')
      .eq('id', card_id)
      .single();

    if (cardError || !card) {
      console.error(`[upload-card-image] Carta não encontrada: ${card_id}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Carta não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[upload-card-image] Carta encontrada: ${card.name}`);

    // Decodificar base64
    const base64Data = image_base64.includes(',') ? image_base64.split(',')[1] : image_base64;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Gerar nome do arquivo
    const safeFilename = filename || `${card_id}.png`;
    const storagePath = `cards/${card_id}-${Date.now()}.png`;

    console.log(`[upload-card-image] Fazendo upload para: ${storagePath}`);

    // Upload para storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('card-images')
      .upload(storagePath, bytes.buffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error(`[upload-card-image] Erro no upload:`, uploadError);
      return new Response(
        JSON.stringify({ success: false, error: `Erro no upload: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[upload-card-image] Upload concluído:`, uploadData);

    // Obter URL pública
    const { data: publicUrlData } = supabase.storage
      .from('card-images')
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;
    console.log(`[upload-card-image] URL pública: ${publicUrl}`);

    // Atualizar carta no banco
    const { error: updateError } = await supabase
      .from('cards')
      .update({ image_url: publicUrl })
      .eq('id', card_id);

    if (updateError) {
      console.error(`[upload-card-image] Erro ao atualizar carta:`, updateError);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao atualizar carta: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[upload-card-image] Carta atualizada com sucesso: ${card.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        card_id,
        card_name: card.name,
        image_url: publicUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[upload-card-image] Erro:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
