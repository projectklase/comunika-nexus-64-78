import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se é administrador
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roles?.role !== 'administrador') {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting avatar unlock corrections...');

    // FASE 1: Aplicar requisitos nos avatares COMMON
    const avatarUpdates = [
      { name: '🐸 Sapo Saltitante', required_xp: 10, required_streak_days: null },
      { name: '🐧 Pinguim Estiloso', required_xp: 20, required_streak_days: null },
      { name: '🐨 Coala Sonolento', required_xp: 30, required_streak_days: null },
      { name: '🦊 Raposa Esperta', required_xp: 50, required_streak_days: null },
      { name: '🐼 Panda Relaxado', required_xp: null, required_streak_days: 1 },
      { name: '🦉 Coruja Sábia', required_xp: null, required_streak_days: 2 },
      { name: '🦁 Leão Corajoso', required_xp: null, required_streak_days: 3 },
    ];

    for (const avatar of avatarUpdates) {
      await supabaseClient
        .from('unlockables')
        .update({
          required_xp: avatar.required_xp,
          required_streak_days: avatar.required_streak_days,
        })
        .eq('name', avatar.name);
    }

    console.log('Phase 1: Applied requirements to COMMON avatars');

    // IDs das alunas
    const alineId = 'd28d4f1c-fc41-4c56-8445-c501d0585d58';
    const karenId = '2ca72d74-f0ac-407e-a524-c08e54e94efb';

    // FASE 2: Desequipar avatar atual da Aline
    await supabaseClient
      .from('user_unlocks')
      .update({ is_equipped: false })
      .eq('user_id', alineId)
      .eq('is_equipped', true);

    console.log('Phase 2: Unequipped Aline current avatar');

    // FASE 3: Remover desbloqueios indevidos da Aline
    const { data: invalidAvatars } = await supabaseClient
      .from('unlockables')
      .select('id')
      .in('name', [
        '🐧 Pinguim Estiloso',
        '🐨 Coala Sonolento',
        '🦊 Raposa Esperta',
        '🦉 Coruja Sábia',
        '🦁 Leão Corajoso',
      ]);

    if (invalidAvatars && invalidAvatars.length > 0) {
      const invalidIds = invalidAvatars.map(a => a.id);
      await supabaseClient
        .from('user_unlocks')
        .delete()
        .eq('user_id', alineId)
        .in('unlockable_id', invalidIds);
    }

    console.log('Phase 3: Removed invalid unlocks from Aline');

    // FASE 4: Adicionar desbloqueios corretos para Karen
    const { data: karenAvatars } = await supabaseClient
      .from('unlockables')
      .select('id')
      .in('name', [
        '🐶 Cachorro Amigável',
        '🐱 Gato Fofo',
        '🐰 Coelho Veloz',
        '🐸 Sapo Saltitante',
        '🐧 Pinguim Estiloso',
        '🐼 Panda Relaxado',
      ]);

    if (karenAvatars && karenAvatars.length > 0) {
      for (const avatar of karenAvatars) {
        await supabaseClient
          .from('user_unlocks')
          .upsert({
            user_id: karenId,
            unlockable_id: avatar.id,
            is_equipped: false,
            unlocked_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,unlockable_id',
            ignoreDuplicates: true,
          });
      }
    }

    console.log('Phase 4: Added correct unlocks for Karen');

    // FASE 5: Equipar Panda para Aline
    const { data: panda } = await supabaseClient
      .from('unlockables')
      .select('id')
      .eq('name', '🐼 Panda Relaxado')
      .single();

    if (panda) {
      await supabaseClient
        .from('user_unlocks')
        .update({ is_equipped: true })
        .eq('user_id', alineId)
        .eq('unlockable_id', panda.id);
    }

    console.log('Phase 5: Equipped Panda for Aline');

    // Obter contagens finais
    const { count: alineCount } = await supabaseClient
      .from('user_unlocks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', alineId);

    const { count: karenCount } = await supabaseClient
      .from('user_unlocks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', karenId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Avatar unlocks corrected successfully',
        results: {
          aline: {
            unlocked_avatars: alineCount,
            equipped: '🐼 Panda Relaxado',
          },
          karen: {
            unlocked_avatars: karenCount,
          },
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error fixing avatar unlocks:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
