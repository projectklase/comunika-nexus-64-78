import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeliveryNotificationPayload {
  deliveryId: string;
  postId: string;
  classId: string;
  studentId: string;
  studentName: string;
  activityTitle: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: DeliveryNotificationPayload = await req.json();
    const { deliveryId, postId, classId, studentId, studentName, activityTitle } = payload;

    console.log('📬 Creating delivery notification:', { deliveryId, postId, studentId, studentName });

    // Buscar professores da turma (main_teacher_id)
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('main_teacher_id, school_id')
      .eq('id', classId)
      .single();

    if (classError || !classData?.main_teacher_id) {
      console.error('❌ Class or teacher not found:', classError);
      return new Response(
        JSON.stringify({ error: 'Turma ou professor não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const teacherId = classData.main_teacher_id;
    const schoolId = classData.school_id;

    // Criar notificação para o professor
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: teacherId,
        type: 'DELIVERY_SUBMITTED',
        title: 'Nova Entrega Recebida',
        message: `${studentName} entregou: ${activityTitle}`,
        role_target: 'PROFESSOR',
        link: `/professor/turma/${classId}/atividade/${postId}?tab=entregas`,
        is_read: false,
        meta: {
          deliveryId,
          postId,
          classId,
          studentId,
          studentName,
          activityTitle,
          school_id: schoolId
        }
      });

    if (notificationError) {
      console.error('❌ Error creating notification:', notificationError);
      throw notificationError;
    }

    console.log('✅ Delivery notification created for teacher:', teacherId);

    return new Response(
      JSON.stringify({ success: true, teacherId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in create-delivery-notification:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
