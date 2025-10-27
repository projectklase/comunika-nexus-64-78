import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PostNotificationRequest {
  post: any;
  action: "created" | "updated" | "deadline_changed";
  oldPost?: any;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const requestData: PostNotificationRequest = await req.json();
    const { post, action, oldPost } = requestData;

    console.log("[create-post-notifications] Processing:", { postId: post.id, action, audience: post.audience });

    // Validar campos obrigatórios
    if (!post || !post.id || !post.type || !post.title || !action) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: post (com id, type, title), action" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const isImportant = post.meta?.important || false;
    console.log("[DEBUG] ⭐ Post importante?", isImportant);
    console.log("[DEBUG] ⭐ post.meta:", JSON.stringify(post.meta));
    console.log("[DEBUG] ⭐ Tipo de notificação:", isImportant ? "POST_IMPORTANT" : "POST_NEW");
    const scope = post.audience === "CLASS" && post.classIds?.length ? `CLASS:${post.classIds.join(",")}` : "GLOBAL";

    // Determinar audiências
    const audiences: Array<"ALUNO" | "PROFESSOR" | "SECRETARIA"> = [];

    if (post.audience === "GLOBAL") {
      audiences.push("ALUNO", "PROFESSOR");
      if (post.type === "AVISO" || post.type === "COMUNICADO") {
        audiences.push("SECRETARIA");
      }
    } else if (post.audience === "CLASS") {
      audiences.push("ALUNO");
      if (post.classIds?.length) {
        audiences.push("PROFESSOR");
      }
    }

    console.log("[create-post-notifications] Target audiences:", audiences);

    // Gerar conteúdo da notificação
    let titlePrefix = "";
    let messageAction = "";

    switch (action) {
      case "created":
        titlePrefix = "Novo";
        messageAction = "foi publicado";
        break;
      case "updated":
        titlePrefix = "Atualizado";
        messageAction = "foi atualizado";
        break;
      case "deadline_changed":
        titlePrefix = "Prazo alterado";
        messageAction = "teve o prazo alterado";
        break;
    }

    const typeLabels: Record<string, string> = {
      ATIVIDADE: "atividade",
      TRABALHO: "trabalho",
      PROVA: "prova",
      EVENTO: "evento",
      AVISO: "aviso",
      COMUNICADO: "comunicado",
    };

    const postTypeLabel = typeLabels[post.type] || "post";

    // Mapeamento de roles
    const roleMapping: Record<string, string> = {
      ALUNO: "aluno",
      PROFESSOR: "professor",
      SECRETARIA: "secretaria",
    };

    let totalCreated = 0;
    const notificationsToInsert = [];

    // Processar cada audiência
    for (const roleTarget of audiences) {
      console.log("[create-post-notifications] Processing roleTarget:", roleTarget);

      try {
        // Buscar user_ids com SERVICE_ROLE (bypassa RLS)
        const { data: userRoles, error: roleError } = await supabaseAdmin
          .from("user_roles")  // ✅ Tabela CORRETA
          .select("user_id")
          .eq("role", roleMapping[roleTarget]);

        if (roleError) {
          console.error("[create-post-notifications] Error fetching user roles:", roleError);
          continue;
        }

        let targetUserIds = userRoles?.map((r) => r.user_id) || []; // ✅ Usar user_id da tabela user_roles


        console.log("[create-post-notifications] Found", targetUserIds.length, "users with role:", roleTarget);

        if (targetUserIds.length === 0) {
          console.log("[create-post-notifications] No users found for role:", roleTarget);
          continue;
        }

        // Filtrar por turmas se necessário
        if (post.audience === "CLASS" && post.classIds?.length) {
          if (roleTarget === "ALUNO") {
            const { data: classStudents, error: classError } = await supabaseAdmin
              .from("class_students")
              .select("student_id")
              .in("class_id", post.classIds);

            if (!classError && classStudents) {
              const classUserIds = classStudents.map((cs) => cs.student_id);
              targetUserIds = targetUserIds.filter((id) => classUserIds.includes(id));
              console.log("[create-post-notifications] Filtered to", targetUserIds.length, "students in classes");
            } else if (classError) {
              console.error("[create-post-notifications] Error fetching class students:", classError);
              continue;
            }
          }
        }

        // ✅ Coletar todas as notificações para inserção em lote
        const actionKey = action === "deadline_changed" ? "deadline" : action;
        const baseKey = `post:${post.id}:${scope}:${actionKey}`;
        const link = post.classIds?.[0] ? `/feed/${post.classIds[0]}/${post.id}` : `/feed/${post.id}`;

        for (const userId of targetUserIds) {
          const notificationKey = `${baseKey}:${userId}`;

          notificationsToInsert.push({
            user_id: userId,
            type: isImportant ? "POST_IMPORTANT" : "POST_NEW",
            title: `${titlePrefix} ${postTypeLabel}: ${post.title}`,
            message: `${post.title} ${messageAction}${post.dueAt ? ` - Prazo: ${new Date(post.dueAt).toLocaleDateString("pt-BR")}` : ""}${post.eventStartAt ? ` - Data: ${new Date(post.eventStartAt).toLocaleDateString("pt-BR")}` : ""}`,
            link,
            role_target: roleTarget,
            meta: {
              postId: post.id,
              postType: post.type,
              action,
              scope,
              important: isImportant,
              notificationKey, // ✅ Chave única para constraint
              authorName: post.authorName,
              classId: post.classIds?.[0],
              dueDate: post.dueAt,
              eventStartAt: post.eventStartAt,
            },
          });
        }
      } catch (error) {
        console.error(`[create-post-notifications] Error processing ${roleTarget}:`, error);
      }
    }

    console.log("[create-post-notifications] Total notifications to insert:", notificationsToInsert.length);

    // ✅ Inserção em lote - duplicatas são ignoradas automaticamente pela constraint única
    if (notificationsToInsert.length > 0) {
      const { data, error: insertError } = await supabaseAdmin
        .from("notifications")
        .insert(notificationsToInsert)
        .select("id");

      // PostgreSQL ignora duplicatas automaticamente devido ao índice único
      if (insertError && !insertError.message?.includes("duplicate key")) {
        console.error("[create-post-notifications] ❌ ERRO ao inserir notificações:", insertError);
        return new Response(JSON.stringify({ error: "Erro ao inserir notificações" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }
      
      totalCreated = data?.length || 0;
      console.log(`[create-post-notifications] ✅ ${totalCreated} notificações criadas (duplicatas ignoradas)`);
    }

    console.log("[create-post-notifications] Total notifications created:", totalCreated);

    return new Response(JSON.stringify({ success: true, created: totalCreated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[create-post-notifications] Function error:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao criar notificações" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
