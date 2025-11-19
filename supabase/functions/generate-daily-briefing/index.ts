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

    // 2. Buscar todas as escolas ativas
    const { data: schools, error: schoolsError } = await supabaseAdmin
      .from("schools")
      .select("id, name")
      .eq("is_active", true);

    if (schoolsError) {
      console.error("[CRON Job] ❌ Erro ao buscar escolas:", schoolsError);
      throw schoolsError;
    }

    if (!schools || schools.length === 0) {
      console.log("[CRON Job] ⚠️ Nenhuma escola ativa encontrada");
      return new Response(
        JSON.stringify({ success: true, message: "Nenhuma escola ativa para processar" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CRON Job] 📊 Processando ${schools.length} escola(s)...`);

    const daysFilter = 30;
    const results = [];

    // 3. Processar cada escola individualmente
    for (const school of schools) {
      try {
        console.log(`[CRON Job] 🏫 Processando escola: ${school.name} (${school.id})`);

        // Buscar KPIs da escola específica
        const { data: evasionData, error: evasionError } = await supabaseAdmin
          .rpc("get_evasion_risk_analytics", { 
            days_filter: daysFilter,
            school_id_param: school.id 
          });

        if (evasionError) {
          console.error(`[CRON Job] ❌ Erro ao buscar evasion analytics para ${school.name}:`, evasionError);
          results.push({ school: school.name, status: 'error', error: evasionError.message });
          continue;
        }

        const { data: postReadData, error: postReadError } = await supabaseAdmin
          .rpc("get_post_read_analytics", { 
            days_filter: daysFilter,
            school_id_param: school.id 
          });

        if (postReadError) {
          console.error(`[CRON Job] ❌ Erro ao buscar post read analytics para ${school.name}:`, postReadError);
          results.push({ school: school.name, status: 'error', error: postReadError.message });
          continue;
        }

        console.log(`[CRON Job] ✅ KPIs carregados para ${school.name}`);

        // Preparar contexto para a IA
        const analyticsContext: AnalyticsContext = {
          evasionAnalytics: evasionData,
          postReadAnalytics: postReadData,
        };

        // Chamar IA Lovable
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

        console.log(`[CRON Job] 🤖 Chamando IA Lovable para ${school.name}...`);

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
                            description: "Análise preditiva sobre evasão",
                          },
                          recommendations: {
                            type: "array",
                            items: { type: "string" },
                            description: "Lista de 3-5 recomendações prioritárias",
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
                            description: "Tendência de engajamento",
                          },
                          analysis: {
                            type: "string",
                            description: "Análise qualitativa do engajamento",
                          },
                          opportunities: {
                            type: "array",
                            items: { type: "string" },
                            description: "Lista de 3-5 oportunidades",
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
                              description: "Descrição da ação",
                            },
                            priority: {
                              type: "string",
                              enum: ["low", "medium", "high"],
                              description: "Nível de prioridade",
                            },
                            impact: {
                              type: "string",
                              description: "Impacto esperado",
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
          console.error(`[CRON Job] ❌ Erro na API da IA para ${school.name}:`, errorText);
          results.push({ school: school.name, status: 'error', error: `AI API error: ${aiResponse.status}` });
          continue;
        }

        const aiData = await aiResponse.json();
        console.log(`[CRON Job] ✅ Resposta da IA recebida para ${school.name}`);

        // Extrair insights do tool call
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) {
          console.error(`[CRON Job] ❌ Resposta da IA sem tool call para ${school.name}`);
          results.push({ school: school.name, status: 'error', error: 'No tool call in AI response' });
          continue;
        }

        const insights = JSON.parse(toolCall.function.arguments);
        console.log(`[CRON Job] ✅ Insights extraídos com sucesso para ${school.name}`);

        // Salvar no banco com school_id
        const { error: updateError } = await supabaseAdmin
          .from("school_settings")
          .upsert([{
            key: "ai_daily_briefing",
            school_id: school.id,
            value: {
              insights: insights,
              generatedAt: new Date().toISOString(),
            },
          }]);

        if (updateError) {
          console.error(`[CRON Job] ❌ Erro ao salvar no banco para ${school.name}:`, updateError);
          results.push({ school: school.name, status: 'error', error: updateError.message });
          continue;
        }

        console.log(`[CRON Job] 🎉 Insights salvos com sucesso para ${school.name}!`);
        results.push({ school: school.name, status: 'success' });

      } catch (schoolError) {
        console.error(`[CRON Job] ❌ Erro ao processar ${school.name}:`, schoolError);
        results.push({ 
          school: school.name, 
          status: 'error', 
          error: schoolError instanceof Error ? schoolError.message : 'Unknown error' 
        });
      }
    }

    // Retornar resumo de todas as escolas processadas
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`[CRON Job] ✅ Processamento concluído: ${successCount} sucesso(s), ${errorCount} erro(s)`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processadas ${schools.length} escola(s): ${successCount} sucesso, ${errorCount} erro`,
        results: results,
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
