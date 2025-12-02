import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CardImageMapping {
  cardId: string;
  cardName: string;
  imageUrl: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Card mappings - card ID to image filename
    const cardMappings: CardImageMapping[] = [
      {
        cardId: '775dd543-5226-483e-af43-9a76324e3a84',
        cardName: 'Contra-Ataque',
        imageUrl: 'contra-ataque.png'
      },
      {
        cardId: '7044b01f-89e0-4619-9098-590bcb342b40',
        cardName: 'Emboscada',
        imageUrl: 'emboscada.png'
      },
      {
        cardId: 'fbe6c7a0-ec45-4666-a60f-00caefef7cfb',
        cardName: 'Escudo Mágico',
        imageUrl: 'escudo-magico.png'
      },
      {
        cardId: 'c211084d-aec5-4374-96e8-a4744a35ce0a',
        cardName: 'Roubo de Energia',
        imageUrl: 'roubo-de-energia.png'
      }
    ];

    const { images } = await req.json();
    
    if (!images || !Array.isArray(images)) {
      return new Response(
        JSON.stringify({ error: 'Images array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const imageData of images) {
      const { cardId, base64, mimeType } = imageData;
      
      const mapping = cardMappings.find(m => m.cardId === cardId);
      if (!mapping) {
        results.push({ cardId, success: false, error: 'Card not found in mappings' });
        continue;
      }

      try {
        // Decode base64 to Uint8Array
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Upload to storage
        const fileName = `${mapping.cardId}-${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('card-images')
          .upload(fileName, bytes, {
            contentType: mimeType || 'image/png',
            upsert: true
          });

        if (uploadError) {
          console.error(`Upload error for ${mapping.cardName}:`, uploadError);
          results.push({ cardId, cardName: mapping.cardName, success: false, error: uploadError.message });
          continue;
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('card-images')
          .getPublicUrl(fileName);

        const publicUrl = publicUrlData.publicUrl;

        // Update card with image URL
        const { error: updateError } = await supabase
          .from('cards')
          .update({ image_url: publicUrl })
          .eq('id', cardId);

        if (updateError) {
          console.error(`Update error for ${mapping.cardName}:`, updateError);
          results.push({ cardId, cardName: mapping.cardName, success: false, error: updateError.message });
          continue;
        }

        console.log(`✅ Successfully uploaded and updated ${mapping.cardName}`);
        results.push({ 
          cardId, 
          cardName: mapping.cardName, 
          success: true, 
          imageUrl: publicUrl 
        });

      } catch (err) {
        console.error(`Error processing ${mapping.cardName}:`, err);
        results.push({ cardId, cardName: mapping.cardName, success: false, error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
