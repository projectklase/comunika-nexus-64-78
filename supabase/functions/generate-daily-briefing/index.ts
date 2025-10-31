// ============================================================
// FASE 2: Edge Function para Geração Diária de Insights (CRON)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsContext {
  evasionAnalytics: any;
  postReadAnalytics: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CRON Job] 🚀 Iniciando geração de insights diários...");

    // 1. Criar cliente Supabase com Service Role Key (bypassa RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !lovableApiKey) {
      throw new Error("Variáveis de ambiente ausentes");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    console.log("[CRON Job] ✅ Cliente Supabase inicializado com Service Role");

    // 2. Buscar KPIs usando Service Role (fixo em 30 dias)
    const daysFilter = 30;

    const { data: evasionData, error: evasionError } = await supabaseAdmin
      .rpc("get_evasion_risk_analytics", { days_filter: daysFilter });

    if (evasionError) {
      console.error("[CRON Job] ❌ Erro ao buscar evasion analytics:", evasionError);
      throw evasionError;
    }

    const { data: postReadData, error: postReadError } = await supabaseAdmin
      .rpc("get_post_read_analytics", { days_filter: daysFilter });

    if (postReadError) {
      console.error("[CRON Job] ❌ Erro ao buscar post read analytics:", postReadError);
      throw postReadError;
    }

    console.log("[CRON Job] ✅ KPIs carregados com sucesso");

    // 3. Preparar contexto para a IA
    const analyticsContext: AnalyticsContext = {
      evasionAnalytics: evasionData,
      postReadAnalytics: postReadData,
    };

    // 4. Chamar IA Lovable (mesmo prompt da função on-demand)
    const systemPrompt = `Você é um assistente especializado em análise educacional e gestão escolar. Sua função é analisar dados de desempenho de alunos e engajamento para gerar insights acionáveis para administradores escolares.

Com base nos dados fornecidos, você deve:
1. Avaliar o nível de risco de evasão e identificar padrões
2. Analisar tendências de engajamento dos alunos
3. Propor ações prioritárias e práticas para melhorar os indicadores
4. Fazer previsões realistas sobre cenários futuros

Seja objetivo, preciso e sempre forneça recomendações acionáveis.`;

    const userPrompt = `Analise os seguintes dados educacionais e gere insights estruturados:

**Dados de Analytics:**
${JSON.stringify(analyticsContext, null, 2)}

Com base nesses dados, forneça uma análise completa usando a função generate_insights.`;

    console.log("[CRON Job] 🤖 Chamando IA Lovable...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
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
              description: "Gera insights estruturados sobre risco de evasão, engajamento, ações prioritárias e previsões futuras",
              parameters: {
                type: "object",
                properties: {
                  evasionInsights: {
                    type: "object",
                    properties: {
                      severity: {
                        type: "string",
                        enum: ["low", "medium", "high", "critical"],
                        description: "Nível de severidade do risco de evasão",
                      },
                      prediction: {
                        type: "string",
                        description: "Previsão detalhada sobre evasão (2-3 frases)",
                      },
                      recommendations: {
                        type: "array",
                        items: { type: "string" },
                        description: "Lista de 3-4 recomendações acionáveis",
                      },
                    },
                    required: ["severity", "prediction", "recommendations"],
                  },
                  engagementInsights: {
                    type: "object",
                    properties: {
                      trend: {
                        type: "string",
                        enum: ["declining", "stable", "growing"],
                        description: "Tendência de engajamento dos alunos",
                      },
                      analysis: {
                        type: "string",
                        description: "Análise detalhada do engajamento (2-3 frases)",
                      },
                      opportunities: {
                        type: "array",
                        items: { type: "string" },
                        description: "Lista de 3-4 oportunidades de melhoria",
                      },
                    },
                    required: ["trend", "analysis", "opportunities"],
                  },
                  priorityActions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action: {
                          type: "string",
                          description: "Ação específica recomendada",
                        },
                        priority: {
                          type: "string",
                          enum: ["low", "medium", "high"],
                          description: "Nível de prioridade",
                        },
                        impact: {
                          type: "string",
                          description: "Impacto esperado da ação",
                        },
                      },
                      required: ["action", "priority", "impact"],
                    },
                    description: "Lista de 3-5 ações prioritárias",
                  },
                  predictions: {
                    type: "object",
                    properties: {
                      nextWeekTrend: {
                        type: "string",
                        description: "Previsão de tendência para próxima semana",
                      },
                      riskForecast: {
                        type: "string",
                        description: "Previsão de risco futuro",
                      },
                    },
                    required: ["nextWeekTrend", "riskForecast"],
                  },
                },
                required: ["evasionInsights", "engagementInsights", "priorityActions", "predictions"],
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "generate_insights" },
        },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[CRON Job] ❌ Erro na API da IA:", errorText);
      throw new Error(`Erro na API da IA: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log("[CRON Job] ✅ Resposta da IA recebida");

    // 5. Extrair insights do tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("Resposta da IA sem tool call");
    }

    const insights = JSON.parse(toolCall.function.arguments);
    console.log("[CRON Job] ✅ Insights extraídos com sucesso");

    // 6. Salvar no banco (UPSERT)
    const { error: updateError } = await supabaseAdmin
      .from("school_settings")
      .upsert(
        {
          key: "ai_daily_briefing",
          value: {
            insights: insights,
            generatedAt: new Date().toISOString(),
          },
        },
        { onConflict: "key" }
      );

    if (updateError) {
      console.error("[CRON Job] ❌ Erro ao salvar no banco:", updateError);
      throw updateError;
    }

    console.log("[CRON Job] 🎉 Insights salvos com sucesso no banco!");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Insights gerados e salvos com sucesso",
        generatedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[CRON Job] ❌ Erro fatal:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
