import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InsightRequest {
  daysFilter: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { daysFilter = 30 } = await req.json() as InsightRequest;

    // Validação de entrada
    if (typeof daysFilter !== "number" || daysFilter < 1 || daysFilter > 365) {
      return new Response(
        JSON.stringify({ error: "daysFilter deve ser um número entre 1 e 365" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar cliente Supabase com JWT do usuário
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Configuração do Supabase ausente" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autorização necessária" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
      auth: {
        persistSession: false,
      },
    });

    // Extrair user ID do JWT (já validado pelo Supabase com verify_jwt = true)
    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length !== 3) {
      return new Response(
        JSON.stringify({ error: "Token JWT inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userId: string;
    try {
      const payload = JSON.parse(atob(parts[1]));
      userId = payload.sub;
      
      if (!userId) {
        throw new Error("User ID não encontrado no token");
      }
    } catch (e) {
      console.error("Erro ao decodificar JWT:", e);
      return new Response(
        JSON.stringify({ error: "Erro ao processar token de autenticação" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se usuário é administrador
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "administrador")
      .maybeSingle();

    if (roleError) {
      console.error("Erro ao verificar role:", roleError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar permissões" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Acesso negado: apenas administradores" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Obter escola atual do usuário
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('current_school_id')
      .eq('id', userId)
      .single();

    if (profileError || !profileData?.current_school_id) {
      return new Response(
        JSON.stringify({ error: "Usuário sem escola configurada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const schoolId = profileData.current_school_id;

    // Buscar dados de analytics
    const { data: evasionData, error: evasionError } = await supabase.rpc(
      "get_evasion_risk_analytics",
      { 
        days_filter: daysFilter,
        school_id_param: schoolId
      }
    );

    const { data: postReadData, error: postReadError } = await supabase.rpc(
      "get_post_read_analytics",
      { 
        days_filter: daysFilter,
        school_id_param: schoolId
      }
    );

    if (evasionError || postReadError) {
      console.error("Erro ao buscar analytics:", evasionError || postReadError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar dados de analytics" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Preparar contexto para IA
    const analyticsContext = {
      evasion: {
        studentsAtRisk: evasionData.students_at_risk_count,
        worstClass: evasionData.worst_class_name,
        pendingCount: evasionData.worst_class_pending_count,
        studentsList: evasionData.students_at_risk_list.slice(0, 5), // Top 5
      },
      engagement: {
        totalPosts: postReadData.total_posts_published,
        totalReads: postReadData.total_reads,
        avgReadRate: postReadData.avg_read_rate,
        topReaders: postReadData.top_readers.slice(0, 3), // Top 3
        lowEngagementPosts: postReadData.posts_with_low_engagement.slice(0, 3),
        readRateByType: postReadData.read_rate_by_type,
      },
      period: daysFilter,
    };

    const systemPrompt = `Você é um consultor educacional especializado em gestão escolar e análise de dados educacionais.

**REGRA DE OURO: LINGUAGEM CLARA E AMIGÁVEL**
🚫 JAMAIS use termos técnicos de banco de dados ou programação
🚫 JAMAIS mencione nomes de campos como "students_at_risk_count", "days_since_last_login", "activity_trend"
🚫 JAMAIS use jargões técnicos ou siglas de sistemas
🚫 JAMAIS copie ou mencione nomes de campos do JSON de dados
✅ SEMPRE use linguagem natural e profissional adequada para gestores educacionais

**EXEMPLOS DE LINGUAGEM:**
❌ ERRADO: "O número 'students_at_risk_count' é 8"
✅ CORRETO: "Atualmente, 8 alunos apresentam sinais de risco de evasão"

❌ ERRADO: "A inconsistência dos 'days_since_last_login' necessita..."
✅ CORRETO: "Alguns alunos não acessam a plataforma há várias semanas, o que indica..."

❌ ERRADO: "Os dados de 'activity_trend' mostram deliveries_made: 0"
✅ CORRETO: "A ausência de entregas de atividades indica baixo engajamento"

❌ ERRADO: "A taxa 'avg_read_rate' de 15.91% indica..."
✅ CORRETO: "Apenas cerca de 16% dos alunos estão lendo as publicações, o que indica..."

**CONTEXTO DOS DADOS FORNECIDOS:**
Você receberá dados estatísticos sobre:
- Número de alunos em situação de risco
- Informações sobre turmas com dificuldades
- Taxas de leitura e engajamento dos alunos
- Quantidade de publicações e interações

**SUA RESPONSABILIDADE:**
1. Interpretar os dados estatísticos e transformá-los em insights compreensíveis
2. Gerar recomendações claras e acionáveis
3. Usar linguagem natural e profissional
4. Evitar qualquer termo técnico de sistemas ou banco de dados
5. Focar em ações práticas para gestores escolares

Período de análise: ${daysFilter} dias`;

    const userPrompt = `Analise os seguintes indicadores educacionais e gere insights estratégicos:

**INDICADORES DE EVASÃO:**
- Alunos identificados em situação de risco: ${analyticsContext.evasion.studentsAtRisk}
- Turma com maior necessidade de atenção: ${analyticsContext.evasion.worstClass || 'Não identificada'}
- Pendências acumuladas nesta turma: ${analyticsContext.evasion.pendingCount}

**INDICADORES DE ENGAJAMENTO:**
- Total de publicações realizadas: ${analyticsContext.engagement.totalPosts}
- Total de leituras registradas: ${analyticsContext.engagement.totalReads}
- Taxa média de leitura: ${analyticsContext.engagement.avgReadRate}%

**INSTRUÇÕES CRÍTICAS:**
1. NÃO mencione nomes de campos técnicos em nenhuma hipótese
2. Use apenas linguagem natural e profissional
3. Interprete os números e transforme em insights acionáveis
4. Foque em recomendações práticas para gestores educacionais
5. Evite jargões de TI, programação ou banco de dados

Use a função generate_insights para estruturar sua resposta de forma clara e sem termos técnicos.`;

    // Chamar Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_insights",
              description: "Gera insights preditivos baseados em dados escolares",
              parameters: {
                type: "object",
                properties: {
                  evasionInsights: {
                    type: "object",
                    properties: {
                      severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                      prediction: { type: "string" },
                      recommendations: {
                        type: "array",
                        items: { type: "string" },
                        minItems: 2,
                        maxItems: 5,
                      },
                    },
                    required: ["severity", "prediction", "recommendations"],
                  },
                  engagementInsights: {
                    type: "object",
                    properties: {
                      trend: { type: "string", enum: ["declining", "stable", "growing"] },
                      analysis: { type: "string" },
                      opportunities: {
                        type: "array",
                        items: { type: "string" },
                        minItems: 2,
                        maxItems: 5,
                      },
                    },
                    required: ["trend", "analysis", "opportunities"],
                  },
                  priorityActions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action: { type: "string" },
                        priority: { type: "string", enum: ["low", "medium", "high"] },
                        impact: { type: "string" },
                      },
                      required: ["action", "priority", "impact"],
                    },
                    minItems: 3,
                    maxItems: 5,
                  },
                  predictions: {
                    type: "object",
                    properties: {
                      nextWeekTrend: { type: "string" },
                      riskForecast: { type: "string" },
                    },
                    required: ["nextWeekTrend", "riskForecast"],
                  },
                },
                required: ["evasionInsights", "engagementInsights", "priorityActions", "predictions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_insights" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao seu workspace Lovable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const errorText = await aiResponse.text();
      console.error("Erro na Lovable AI:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar insights com IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || !toolCall.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "Formato de resposta inválido da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const insights = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ insights, generatedAt: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro ao gerar insights:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
