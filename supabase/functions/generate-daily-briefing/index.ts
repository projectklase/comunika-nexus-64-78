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
    const currentDate = new Date().toISOString();
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
        const systemPrompt = `Você é um consultor educacional especializado em gestão escolar, retenção de alunos e estratégias de captação.

**CONTEXTO IMPORTANTE:**
Você está auxiliando um ADMINISTRADOR ESCOLAR (não um desenvolvedor). Suas recomendações devem ser práticas e executáveis diretamente por gestores educacionais.

**SUAS RESPONSABILIDADES:**
1. Analisar dados de evasão e identificar padrões de risco
2. Avaliar níveis de engajamento e propor melhorias pedagógicas
3. Sugerir ações administrativas para retenção de alunos
4. Identificar oportunidades de captação baseadas no calendário atual
5. Propor eventos, campanhas e iniciativas para atração de novos alunos

**TIPOS DE RECOMENDAÇÕES PERMITIDAS:**
✅ Entrar em contato com alunos específicos (email, telefone, WhatsApp)
✅ Organizar eventos presenciais ou online (workshops, palestras, webinars)
✅ Criar campanhas promocionais e ofertas especiais
✅ Ajustar cronogramas, prazos e calendários acadêmicos
✅ Realizar reuniões com professores, coordenadores ou turmas
✅ Implementar programas de tutoria, mentoria ou monitoria
✅ Promover dinâmicas de grupo e atividades extracurriculares
✅ Desenvolver ações de marketing educacional (redes sociais, anúncios)
✅ Criar parcerias com empresas ou instituições
✅ Organizar dias de portas abertas, aulas experimentais ou demonstrativas

**TIPOS DE RECOMENDAÇÕES PROIBIDAS:**
❌ NUNCA sugira implementar funcionalidades técnicas no sistema
❌ NUNCA recomende desenvolver recursos de software
❌ NUNCA proponha criar alertas automáticos ou dashboards
❌ NUNCA sugira modificações no código ou banco de dados
❌ NUNCA mencione "implementar um sistema de..."

**ANÁLISE DE OPORTUNIDADES SAZONAIS:**
Sempre inclua pelo menos UMA recomendação de captação baseada na data atual, considerando:
- Períodos promocionais (Black Friday, Cyber Monday, etc)
- Feriados nacionais e datas comemorativas
- Início/fim de semestres letivos
- Férias escolares e períodos de matrícula
- Eventos culturais relevantes para educação
- Épocas do ano favoráveis para matrículas

Seja estratégico, objetivo e focado em resultados mensuráveis.`;

        const userPrompt = `DATA ATUAL: ${currentDate}

Analise os seguintes dados educacionais da escola "${school.name}" e gere insights estruturados:

**Dados de Analytics:**
${JSON.stringify(analyticsContext, null, 2)}

Com base nesses dados e na data atual, forneça:
1. Análise do risco de evasão com ações práticas de retenção
2. Avaliação do engajamento com oportunidades de melhoria
3. Ações prioritárias para o administrador executar
4. Pelo menos UMA estratégia de captação de novos alunos baseada no calendário/época atual

Use a função generate_insights para estruturar sua resposta.`;

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
                            description: "Lista de 3-5 recomendações práticas e executáveis pelo administrador (sem sugestões técnicas). Exemplos: contatar alunos inativos, agendar reuniões, criar eventos",
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
                            description: "Lista de 3-5 oportunidades pedagógicas e administrativas. Exemplos: workshops, dinâmicas de grupo, ações de mentoria",
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
                              description: "Descrição da ação prática (eventos, campanhas, contatos, reuniões, ajustes pedagógicos). NUNCA sugerir desenvolvimento de funcionalidades técnicas",
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
                        description: "Lista de 3-5 ações prioritárias. OBRIGATÓRIO: incluir pelo menos uma ação de captação de alunos baseada na data/época atual (ex: campanha Black Friday, aula demonstrativa, evento de portas abertas)",
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
