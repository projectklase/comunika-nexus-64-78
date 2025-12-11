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
  attendanceAnalytics?: any;
}

// Função para validar CRON_SECRET ou JWT
async function validateRequest(req: Request): Promise<{ valid: boolean; reason?: string }> {
  const cronSecret = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('Authorization');
  
  // 1. Verificar se é uma chamada CRON com CRON_SECRET
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    console.log('[Auth] ✅ Validado via CRON_SECRET');
    return { valid: true };
  }
  
  // 2. Verificar se é um usuário autenticado com JWT
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        console.log(`[Auth] ✅ Validado via JWT para usuário: ${user.email}`);
        return { valid: true };
      }
    }
  }
  
  return { valid: false, reason: 'Unauthorized: CRON_SECRET ou JWT válido requerido' };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validar autenticação (CRON_SECRET ou JWT)
  const authResult = await validateRequest(req);
  if (!authResult.valid) {
    console.error(`[Auth] ❌ ${authResult.reason}`);
    return new Response(
      JSON.stringify({ error: authResult.reason }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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

        // Verificar se a escola tem attendance_enabled
        const { data: attendanceFeature } = await supabaseAdmin
          .from("school_settings")
          .select("value")
          .eq("school_id", school.id)
          .eq("key", "attendance_enabled")
          .single();

        const isAttendanceEnabled = attendanceFeature?.value === true;
        let attendanceData = null;

        if (isAttendanceEnabled) {
          console.log(`[CRON Job] 📋 Buscando dados de frequência para ${school.name}...`);
          
          const { data: attData, error: attError } = await supabaseAdmin
            .rpc("get_attendance_analytics", { 
              days_filter: daysFilter,
              school_id_param: school.id 
            });

          if (attError) {
            console.warn(`[CRON Job] ⚠️ Erro ao buscar attendance analytics para ${school.name}:`, attError);
            // Não falhar, apenas continuar sem dados de frequência
          } else {
            attendanceData = attData;
            console.log(`[CRON Job] ✅ Dados de frequência carregados para ${school.name}`);
          }
        }

        console.log(`[CRON Job] ✅ KPIs carregados para ${school.name}`);

        // Preparar contexto para a IA
        const analyticsContext: AnalyticsContext = {
          evasionAnalytics: evasionData,
          postReadAnalytics: postReadData,
          ...(attendanceData && { attendanceAnalytics: attendanceData }),
        };

        // Chamar IA Lovable
        const systemPrompt = `Você é um consultor educacional especializado em gestão escolar, retenção de alunos e estratégias de captação.

**REGRA DE OURO: ZERO TERMOS TÉCNICOS**
🚫 JAMAIS use nomes de campos de banco de dados (students_at_risk_count, days_since_last_login, activity_trend, deliveries_made, etc)
🚫 JAMAIS mencione termos de programação ou sistemas (avg_read_rate, total_reads, posts_with_low_engagement)
🚫 JAMAIS use siglas técnicas ou jargões de TI
🚫 JAMAIS copie ou cite nomes de campos do JSON fornecido
✅ SEMPRE traduza dados técnicos em linguagem clara e profissional para gestores educacionais

**TRANSFORMAÇÃO DE LINGUAGEM - EXEMPLOS:**
❌ "O campo 'students_at_risk_count' indica 8 alunos"
✅ "Atualmente, 8 alunos apresentam sinais preocupantes"

❌ "A inconsistência dos 'days_since_last_login' para alunos em risco (todos com 0 dias)"
✅ "Diversos alunos não têm acessado a plataforma recentemente"

❌ "Os dados de 'activity_trend' mostram deliveries_made: 0 e activities_published: 0"
✅ "Não houve publicações nem entregas de atividades no período analisado"

❌ "A taxa 'avg_read_rate' de 15.91% indica..."
✅ "Apenas cerca de 16% dos alunos estão lendo as publicações, indicando..."

❌ "O 'worst_class_name' é '3º Ano A' com 'worst_class_pending_count': 12"
✅ "A turma do 3º Ano A apresenta 12 atividades pendentes, sinalizando necessidade de atenção"

**CONTEXTO IMPORTANTE:**
Você está auxiliando um ADMINISTRADOR ESCOLAR (não um desenvolvedor). Suas recomendações devem ser práticas e executáveis diretamente por gestores educacionais.

**SUAS RESPONSABILIDADES:**
1. INTERPRETAR dados estatísticos e transformá-los em insights compreensíveis
2. Analisar riscos de evasão e identificar padrões preocupantes
3. Avaliar níveis de engajamento e propor melhorias pedagógicas
4. Sugerir ações administrativas para retenção de alunos
5. Identificar oportunidades de captação baseadas no calendário atual
6. Propor eventos, campanhas e iniciativas para atração de novos alunos
7. **ANÁLISE DE FREQUÊNCIA**: Se dados de frequência estiverem disponíveis, identificar alunos e turmas com padrão de faltas preocupante

**ANÁLISE DE FREQUÊNCIA (quando dados disponíveis):**
- Identificar alunos com alto número de faltas que precisam de atenção
- Correlacionar ausências com risco de evasão (faltas frequentes = sinal de abandono)
- Destacar turmas com taxa de presença abaixo do aceitável (< 80%)
- Recomendar ações específicas: contato com família, reunião com coordenação, acompanhamento pedagógico
- Priorizar alunos com faltas consecutivas (maior urgência)

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
✅ Contatar famílias de alunos com faltas excessivas
✅ Agendar reuniões de acompanhamento pedagógico

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

        const attendancePromptSection = attendanceData ? `
**DADOS DE FREQUÊNCIA/LISTA DE CHAMADA:**
Os dados de frequência abaixo mostram a situação de presença e ausência dos alunos. Analise com atenção especial:
- Taxa geral de presença da escola
- Turmas com baixa frequência
- Alunos com padrão de faltas preocupante
- Correlação entre faltas e risco de evasão

IMPORTANTE: Alunos que faltam frequentemente são fortes candidatos a abandono escolar. Priorize ações de retenção para esses casos.
` : '';

        const userPrompt = `DATA ATUAL: ${currentDate}

Analise os seguintes indicadores educacionais da escola "${school.name}":

**IMPORTANTE:** Os dados abaixo contêm informações estatísticas brutas. Você DEVE interpretar esses dados e apresentá-los em linguagem clara, NUNCA mencionando os nomes técnicos dos campos.

**Dados Estatísticos Disponíveis:**
${JSON.stringify(analyticsContext, null, 2)}
${attendancePromptSection}

**INSTRUÇÕES CRÍTICAS PARA ANÁLISE:**
1. Interprete os números e transforme em insights claros e naturais
2. NÃO copie ou mencione nomes de campos técnicos em nenhuma hipótese
3. Use linguagem profissional adequada para gestores escolares (não desenvolvedores)
4. Gere recomendações práticas e executáveis
5. Evite qualquer jargão de TI, programação ou banco de dados
${attendanceData ? '6. PRIORIZE a análise de frequência - alunos com muitas faltas precisam de atenção URGENTE' : ''}

**ESTRUTURA ESPERADA:**
1. Análise do risco de evasão com ações práticas de retenção
2. Avaliação do engajamento com oportunidades de melhoria
${attendanceData ? '3. Análise detalhada de frequência com identificação de alunos e turmas em risco' : ''}
${attendanceData ? '4' : '3'}. Ações prioritárias para o administrador executar
${attendanceData ? '5' : '4'}. Pelo menos UMA estratégia de captação de novos alunos baseada no calendário/época atual

Use a função generate_insights para estruturar sua resposta com linguagem 100% natural.`;

        console.log(`[CRON Job] 🤖 Chamando IA Lovable para ${school.name}...`);

        // Build tools schema - add attendanceInsights if attendance data is available
        const toolsSchema: any = {
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
        };

        // Add attendanceInsights to schema if attendance data available
        if (attendanceData) {
          toolsSchema.attendanceInsights = {
            type: "object",
            properties: {
              status: {
                type: "string",
                enum: ["critical", "warning", "healthy"],
                description: "Status geral da frequência escolar",
              },
              summary: {
                type: "string",
                description: "Resumo executivo da situação de frequência da escola em linguagem clara para gestores",
              },
              studentsNeedingAttention: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    description: {
                      type: "string",
                      description: "Descrição do aluno ou grupo de alunos que precisam de atenção (ex: 'Alunos do 3º Ano com mais de 5 faltas')",
                    },
                    urgency: {
                      type: "string",
                      enum: ["immediate", "soon", "monitor"],
                      description: "Nível de urgência para ação",
                    },
                  },
                  required: ["description", "urgency"],
                },
                description: "Lista de alunos ou grupos que precisam de atenção especial por conta de faltas",
              },
              classesWithLowAttendance: {
                type: "array",
                items: { type: "string" },
                description: "Lista de turmas com taxa de presença abaixo de 80%",
              },
              correlationWithEvasion: {
                type: "string",
                description: "Análise da correlação entre faltas frequentes e risco de abandono escolar",
              },
              recommendations: {
                type: "array",
                items: { type: "string" },
                description: "Lista de 3-5 ações específicas para melhorar a frequência (contato com famílias, reuniões, acompanhamento)",
              },
            },
            required: ["status", "summary", "correlationWithEvasion", "recommendations"],
          };
        }

        const requiredFields = ["evasionInsights", "engagementInsights", "priorityActions", "predictions"];
        if (attendanceData) {
          requiredFields.push("attendanceInsights");
        }

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
                  description: "Gera insights estruturados sobre risco de evasão, engajamento, frequência, ações prioritárias e previsões futuras",
                  parameters: {
                    type: "object",
                    properties: toolsSchema,
                    required: requiredFields,
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
        console.log(`[CRON Job] ✅ Insights extraídos com sucesso para ${school.name}${attendanceData ? ' (incluindo frequência)' : ''}`);

        // Salvar no banco com school_id
        const { error: updateError } = await supabaseAdmin
          .from("school_settings")
          .upsert([{
            key: "ai_daily_briefing",
            school_id: school.id,
            value: {
              insights: insights,
              generatedAt: new Date().toISOString(),
              includesAttendance: !!attendanceData,
            },
          }]);

        if (updateError) {
          console.error(`[CRON Job] ❌ Erro ao salvar no banco para ${school.name}:`, updateError);
          results.push({ school: school.name, status: 'error', error: updateError.message });
          continue;
        }

        console.log(`[CRON Job] 🎉 Insights salvos com sucesso para ${school.name}!`);
        results.push({ school: school.name, status: 'success', includesAttendance: !!attendanceData });

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
