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

    const { card_id, image_base64, file_name } = await req.json();

    if (!card_id || !image_base64 || !file_name) {
      return new Response(
        JSON.stringify({ error: 'card_id, image_base64, and file_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify card exists
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('id, name')
      .eq('id', card_id)
      .single();

    if (cardError || !card) {
      return new Response(
        JSON.stringify({ error: 'Card not found', details: cardError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode base64 image
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Determine content type from file extension
    const extension = file_name.split('.').pop()?.toLowerCase() || 'png';
    const contentType = extension === 'jpg' || extension === 'jpeg' 
      ? 'image/jpeg' 
      : extension === 'webp' 
        ? 'image/webp' 
        : 'image/png';

    // Upload to storage
    const storagePath = `${card_id}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('card-images')
      .upload(storagePath, imageBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload image', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('card-images')
      .getPublicUrl(storagePath);

    // Update card with image URL
    const { error: updateError } = await supabase
      .from('cards')
      .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', card_id);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update card', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully uploaded image for card: ${card.name} (${card_id})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        card_id,
        card_name: card.name,
        image_url: publicUrl 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
