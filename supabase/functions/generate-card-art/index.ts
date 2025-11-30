import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Prompts temáticos por categoria (estilo Crowno Monsters)
const CATEGORY_PROMPTS = {
  MATEMATICA: `cute fantasy creature made of mathematical symbols and geometric shapes, 
    numbers and equations floating around its body, calculator elements, 
    vibrant blue and purple color scheme, cartoon creature style like Crowno Monsters, 
    friendly expressive face, centered composition on dark background`,
  
  CIENCIAS: `adorable laboratory creature with scientific equipment features, 
    DNA helixes, atoms, bubbling potions, molecular structures, 
    glowing emerald green and teal colors, fantasy creature art style, 
    curious intelligent expression, centered on dark background`,
  
  HISTORIA: `majestic historical guardian creature with ancient armor elements, 
    crowns, shields, roman or greek aesthetic, historical artifacts, 
    golden and bronze metallic tones, epic fantasy character design, 
    proud noble posture, centered on dark background`,
  
  ARTES: `whimsical artistic spirit creature with paintbrush tail, 
    colorful paint splashes, canvas textures, creative tools, 
    rainbow color palette with artistic flair, imaginative fantasy character, 
    playful creative expression, centered on dark background`,
  
  ESPORTES: `energetic athletic creature with sporty accessories, 
    dynamic action pose, sports equipment elements, medals, 
    vibrant orange and red energy aura, cartoon mascot style, 
    determined competitive expression, centered on dark background`,
  
  ESPECIAL: `mystical legendary creature with magical cosmic aura, 
    stars and sparkles, celestial elements, ethereal glow, 
    radiant golden and silver light effects, epic mythical fantasy art, 
    otherworldly majestic presence, centered on dark background`
};

// Modificadores de qualidade por raridade
const RARITY_MODIFIERS = {
  COMMON: 'simple clean design, friendly approachable look, basic details',
  RARE: 'detailed features with glowing accents, polished appearance, enhanced textures',
  EPIC: 'elaborate intricate design, magical particle effects, impressive aura, rich details',
  LEGENDARY: 'ultra detailed masterpiece, radiant golden divine aura, epic majestic appearance, mythical legendary creature, maximum visual impact'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { card_id, custom_prompt } = await req.json();

    console.log('Generating art for card:', card_id);

    // Buscar dados da carta
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', card_id)
      .single();

    if (cardError || !card) {
      throw new Error('Card not found');
    }

    console.log('Card found:', card.name, card.category, card.rarity);

    // Construir prompt baseado na categoria e raridade
    const categoryPrompt = CATEGORY_PROMPTS[card.category as keyof typeof CATEGORY_PROMPTS] || CATEGORY_PROMPTS.ESPECIAL;
    const rarityModifier = RARITY_MODIFIERS[card.rarity as keyof typeof RARITY_MODIFIERS] || RARITY_MODIFIERS.COMMON;

    const fullPrompt = custom_prompt || `Create a collectible card game character illustration:

Character Name: ${card.name}
Character Concept: ${card.description || 'A mystical creature'}

Visual Style: ${categoryPrompt}

Quality Level: ${rarityModifier}

Requirements:
- Cartoon fantasy creature style inspired by Crowno Monsters
- Vibrant saturated colors with high contrast
- Expressive large eyes and friendly face
- Centered composition with character filling most of frame
- Clean dark background (dark gray or black) for card display
- No text, no borders, just the character
- Square format suitable for card art
- Professional digital illustration quality`;

    console.log('Calling Gemini Image API...');

    // Chamar Gemini Image API
    const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{
          role: "user",
          content: fullPrompt
        }],
        modalities: ["image", "text"]
      })
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error('Gemini API error:', imageResponse.status, errorText);
      throw new Error(`Gemini API error: ${imageResponse.status}`);
    }

    const imageData = await imageResponse.json();
    console.log('Image generated successfully');

    // Extrair imagem base64
    const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) {
      throw new Error('No image returned from Gemini');
    }

    // Converter base64 para blob
    const base64Data = imageUrl.split(',')[1];
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Fazer upload para Storage
    const fileName = `${card_id}-${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('card-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    console.log('Image uploaded:', fileName);

    // Obter URL pública
    const { data: publicUrlData } = supabase.storage
      .from('card-images')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    // Atualizar carta com URL da imagem
    const { error: updateError } = await supabase
      .from('cards')
      .update({ 
        image_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', card_id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    console.log('Card updated with image URL');

    return new Response(
      JSON.stringify({ 
        success: true, 
        image_url: publicUrl,
        card_name: card.name,
        message: `Arte gerada para ${card.name}!`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-card-art:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
