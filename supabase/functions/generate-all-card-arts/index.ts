import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Prompts temáticos por categoria (estilo Crowno Monsters)
const CATEGORY_PROMPTS: Record<string, string> = {
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
const RARITY_MODIFIERS: Record<string, string> = {
  COMMON: 'simple clean design, friendly approachable look, basic details',
  RARE: 'detailed features with glowing accents, polished appearance, enhanced textures',
  EPIC: 'elaborate intricate design, magical particle effects, impressive aura, rich details',
  LEGENDARY: 'ultra detailed masterpiece, radiant golden divine aura, epic majestic appearance, mythical legendary creature, maximum visual impact'
};

async function generateCardArt(
  supabase: any,
  card: { id: string; name: string; description: string | null; category: string; rarity: string; card_type: string | null },
  lovableApiKey: string
): Promise<{ success: boolean; card_name: string; error?: string }> {
  try {
    console.log(`Generating art for: ${card.name} (${card.category}/${card.rarity})`);

    const categoryPrompt = CATEGORY_PROMPTS[card.category] || CATEGORY_PROMPTS.ESPECIAL;
    const rarityModifier = RARITY_MODIFIERS[card.rarity] || RARITY_MODIFIERS.COMMON;

    // Special prompt for TRAP/SPELL cards
    const isTrapOrSpell = card.card_type === 'TRAP' || card.card_type === 'SPELL';
    const cardTypeModifier = isTrapOrSpell 
      ? 'magical spell card or trap card design, glowing runes and mystical symbols, arcane energy swirls, no creature - just magical effect visualization'
      : '';

    const fullPrompt = `Create a collectible card game character illustration:

Character Name: ${card.name}
Character Concept: ${card.description || 'A mystical creature'}

Visual Style: ${isTrapOrSpell ? cardTypeModifier : categoryPrompt}

Quality Level: ${rarityModifier}

Requirements:
- ${isTrapOrSpell ? 'Magical spell/trap card effect visualization' : 'Cartoon fantasy creature style inspired by Crowno Monsters'}
- Vibrant saturated colors with high contrast
- ${isTrapOrSpell ? 'Mystical glowing effects and runes' : 'Expressive large eyes and friendly face'}
- Centered composition with ${isTrapOrSpell ? 'effect' : 'character'} filling most of frame
- Clean dark background (dark gray or black) for card display
- No text, no borders, just the ${isTrapOrSpell ? 'magical effect' : 'character'}
- Square format suitable for card art
- Professional digital illustration quality`;

    // Call Gemini Image API
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
      console.error(`Gemini API error for ${card.name}:`, imageResponse.status, errorText);
      return { success: false, card_name: card.name, error: `Gemini API error: ${imageResponse.status}` };
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      return { success: false, card_name: card.name, error: 'No image returned from Gemini' };
    }

    // Convert base64 to blob
    const base64Data = imageUrl.split(',')[1];
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Upload to Storage
    const fileName = `${card.id}-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from('card-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error(`Upload error for ${card.name}:`, uploadError);
      return { success: false, card_name: card.name, error: uploadError.message };
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('card-images')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    // Update card with image URL
    const { error: updateError } = await supabase
      .from('cards')
      .update({ 
        image_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', card.id);

    if (updateError) {
      console.error(`Update error for ${card.name}:`, updateError);
      return { success: false, card_name: card.name, error: updateError.message };
    }

    console.log(`✅ Generated art for: ${card.name}`);
    return { success: true, card_name: card.name };

  } catch (error) {
    console.error(`Error generating art for ${card.name}:`, error);
    return { success: false, card_name: card.name, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse optional limit from request body
    let limit = 10; // Default batch size
    try {
      const body = await req.json();
      if (body.limit) limit = body.limit;
    } catch {
      // No body provided, use default
    }

    // Fetch cards without images
    const { data: cards, error: fetchError } = await supabase
      .from('cards')
      .select('id, name, description, category, rarity, card_type')
      .or('image_url.is.null,image_url.eq.')
      .order('category')
      .order('rarity')
      .limit(limit);

    if (fetchError) {
      throw new Error(`Failed to fetch cards: ${fetchError.message}`);
    }

    if (!cards || cards.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Todas as cartas já possuem imagem!',
          processed: 0,
          remaining: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${cards.length} cards...`);

    const results: { success: boolean; card_name: string; error?: string }[] = [];

    // Process cards sequentially to avoid rate limits
    for (const card of cards) {
      const result = await generateCardArt(supabase, card, lovableApiKey);
      results.push(result);
      
      // Small delay between requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Count remaining cards
    const { count: remaining } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .or('image_url.is.null,image_url.eq.');

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);

    console.log(`Completed: ${successful}/${cards.length} successful`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processadas ${successful} de ${cards.length} cartas`,
        processed: cards.length,
        successful,
        failed: failed.length,
        failedCards: failed,
        remaining: remaining || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-all-card-arts:', error);
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
