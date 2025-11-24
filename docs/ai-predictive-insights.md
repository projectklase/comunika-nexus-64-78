# Sistema de Insights Preditivos com IA

**Última atualização**: 2025-01-24  
**Status**: ✅ Implementado e Validado  
**Prioridade**: 🟡 IMPORTANTE

---

## 📋 Visão Geral

O sistema de **Insights Preditivos** utiliza Inteligência Artificial (OpenAI GPT-4) para analisar dados educacionais e gerar recomendações práticas e acionáveis para gestores escolares.

### Objetivos

✅ Análise de risco de evasão de alunos  
✅ Avaliação de engajamento da comunidade escolar  
✅ Análise de leitura de posts e comunicação  
✅ Previsões de tendências semanais  
✅ Recomendações sazonais de captação de novos alunos  
✅ Linguagem profissional, ZERO termos técnicos  

**Regra de Ouro**: A IA deve gerar insights acionáveis para **gestores educacionais**, não para desenvolvedores de software. Nunca mencionar termos técnicos como "students_at_risk_count", "days_since_last_login", "activity_trend", etc.

---

## 🏗️ Arquitetura do Sistema

### 1. Tabela: `school_settings`

Armazena configurações e insights gerados por escola.

```sql
CREATE TABLE school_settings (
  key TEXT NOT NULL,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  value JSONB,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (key, school_id)
);
```

**Campo crítico**: `school_id` garante isolamento multi-tenant. Cada escola tem seus próprios insights.

**Exemplo de `value` para `ai_daily_briefing`**:
```json
{
  "briefing": "A escola possui atualmente 8 alunos em risco de evasão...",
  "insights": {
    "evasion": {
      "severity": "medium",
      "prediction": "Risco moderado de evasão nos próximos 30 dias",
      "recommendations": [
        "Agendar reuniões individuais com alunos ausentes há mais de 7 dias",
        "Criar grupo de WhatsApp para comunicação direta com responsáveis"
      ]
    },
    "engagement": {
      "trend": "stable",
      "analysis": "Taxa de leitura de posts manteve-se em 68%",
      "opportunities": [
        "Criar posts interativos com enquetes sobre temas de interesse dos alunos",
        "Implementar sistema de notificações push para posts importantes"
      ]
    },
    "priorityActions": [
      {
        "action": "Contatar responsáveis dos 8 alunos em risco imediatamente",
        "priority": "urgent",
        "impact": "high"
      },
      {
        "action": "Agendar evento de integração familiar para próximo mês",
        "priority": "high",
        "impact": "medium"
      }
    ],
    "predictions": {
      "nextWeekTrend": "upward",
      "riskForecast": "A tendência de evasão deve reduzir com ações preventivas"
    }
  },
  "lastRun": "2025-01-24T10:30:00Z"
}
```

### 2. Edge Functions

#### `generate-school-insights` (Manual)

**Localização**: `supabase/functions/generate-school-insights/index.ts`

**Funcionalidade**:
- Acionada manualmente pelo botão "Gerar Novos Insights" no dashboard
- Limitada a uma execução a cada 24 horas por escola
- Busca analytics de evasão e leitura de posts via RPCs
- Envia dados para OpenAI GPT-4 com prompts especializados
- Salva insights em `school_settings` com `school_id` correto

**Prompts Críticos**:
```typescript
const systemPrompt = `Você é um consultor educacional especializado em análise de dados escolares. 
Sua missão é transformar dados estatísticos em insights PRÁTICOS e ACIONÁVEIS para gestores escolares.

REGRA DE OURO: ZERO TERMOS TÉCNICOS
❌ NUNCA USE: students_at_risk_count, days_since_last_login, activity_trend, avg_read_rate
✅ SEMPRE USE: "8 alunos apresentam sinais de risco", "alunos ausentes há mais de 7 dias", "taxa de leitura de 68%"

Responsabilidades:
1. Análise de Risco de Evasão: Identificar alunos em risco e sugerir AÇÕES de retenção
2. Avaliação de Engajamento: Medir participação e sugerir CAMPANHAS de ativação
3. Estratégias de Captação: Recomendar AÇÕES sazonais para atrair novos alunos

Tipos de Recomendações PERMITIDAS:
✅ Eventos escolares (feira de ciências, dia da família)
✅ Campanhas de comunicação (WhatsApp, email, posts)
✅ Reuniões com responsáveis ou alunos
✅ Ações de engajamento (desafios, concursos)

Tipos de Recomendações PROIBIDAS:
❌ Implementações técnicas (criar sistema de notificações, desenvolver dashboard)
❌ Mudanças de software (adicionar funcionalidade X, integrar ferramenta Y)
❌ Código ou banco de dados (criar tabela, adicionar coluna)
`;

const userPrompt = `Analise os dados da escola "${schoolName}" em ${currentDate.toLocaleDateString('pt-BR')} e gere insights:

Dados de Evasão:
${JSON.stringify(evasionAnalytics, null, 2)}

Dados de Leitura de Posts:
${JSON.stringify(postReadAnalytics, null, 2)}

Forneça:
1. Análise de Risco de Evasão: Severidade, previsão e ações de retenção
2. Avaliação de Engajamento: Tendência, análise e oportunidades
3. Ações Prioritárias: Lista de ações práticas ordenadas por urgência
4. Estratégia de Captação: OBRIGATÓRIO incluir pelo menos UMA estratégia de captação de novos alunos baseada na época atual (ex: Janeiro = matrículas para ano letivo)
`;
```

**Descrições de Parâmetros**:
```typescript
const parameters = {
  recommendations: {
    type: "array",
    description: "Ações práticas de retenção para gestores educacionais (ex: agendar reunião com responsáveis, criar evento escolar). NUNCA sugerir implementações técnicas.",
    items: { type: "string" }
  },
  opportunities: {
    type: "array",
    description: "Oportunidades de aumentar engajamento através de eventos, campanhas ou ações de comunicação. NUNCA sugerir desenvolvimento de software.",
    items: { type: "string" }
  },
  priorityActions: {
    type: "array",
    description: "Ações imediatas e práticas que o gestor deve tomar HOJE (ex: contatar responsáveis, agendar evento). NUNCA sugerir tarefas técnicas.",
    items: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "Descrição clara e executável da ação em linguagem natural (ex: 'Agendar reunião com responsáveis dos 8 alunos em risco')"
        },
        priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
        impact: { type: "string", enum: ["high", "medium", "low"] }
      }
    }
  }
};
```

**Exemplo de Chamada OpenAI**:
```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  functions: [{
    name: 'generate_insights',
    description: 'Gera insights educacionais acionáveis para gestores escolares',
    parameters: {
      type: 'object',
      properties: {
        briefing: { type: 'string', description: 'Resumo executivo em português natural' },
        insights: {
          type: 'object',
          properties: {
            evasion: {
              type: 'object',
              properties: {
                severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                prediction: { type: 'string', description: 'Previsão em linguagem natural' },
                recommendations: { /* ... */ }
              }
            },
            // ... outros insights
          }
        }
      }
    }
  }],
  function_call: { name: 'generate_insights' }
});
```

#### `generate-daily-briefing` (Automático)

**Localização**: `supabase/functions/generate-daily-briefing/index.ts`

**Funcionalidade**:
- Executa automaticamente via cron job (ex: 6h da manhã)
- Processa TODAS as escolas ativas
- Lógica idêntica ao `generate-school-insights`, mas em batch
- Armazena insights de cada escola separadamente em `school_settings`

**Diferenças**:
- Não tem limite de 24h (executa sempre no horário programado)
- Processa múltiplas escolas em loop
- Mais leve (apenas briefing, sem interface de loading)

---

## 📊 Dashboard de Insights (Frontend)

### Localização

**Componente**: `src/components/admin/PredictiveInsightsDashboard.tsx`

**Funcionalidade**:
- Exibe insights da escola ativa (`currentSchool.id`)
- Cards temáticos: Análise de Evasão, Engajamento, Ações Prioritárias, Previsões
- Botão "Gerar Novos Insights" (desabilitado se < 24h desde último)
- Indicadores visuais: ícones, cores, badges de severidade/prioridade

### Layout

```
┌─────────────────────────────────────────────────────┐
│  🤖 Insights Preditivos com IA          [🔄 Gerar]  │
│  Última análise: Hoje às 10:30                      │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │ 📊 Análise de   │  │ 💬 Análise de   │          │
│  │    Evasão       │  │    Engajamento  │          │
│  │                 │  │                 │          │
│  │ Severidade:     │  │ Tendência:      │          │
│  │ 🟡 MÉDIA        │  │ 🟢 ESTÁVEL      │          │
│  │                 │  │                 │          │
│  │ Recomendações:  │  │ Oportunidades:  │          │
│  │ • Agendar...    │  │ • Criar posts.. │          │
│  └─────────────────┘  └─────────────────┘          │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🎯 Ações Prioritárias                       │   │
│  │                                              │   │
│  │ ⚠️ URGENTE: Contatar responsáveis (Alto)    │   │
│  │ 🔴 ALTA: Agendar evento familiar (Médio)    │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🔮 Previsões                                 │   │
│  │                                              │   │
│  │ Próxima Semana: 📈 TENDÊNCIA DE ALTA        │   │
│  │ Previsão: A evasão deve reduzir...          │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Hook: `useSchoolSettings`

**Localização**: `src/hooks/useSchoolSettings.ts`

**Funcionalidade**:
- Busca configurações da escola ativa (`currentSchool.id`)
- Filtra por `key = 'ai_daily_briefing'`
- Retorna `briefing`, `insights`, `lastRun`

**Código**:
```typescript
export function useSchoolSettings(key: string = 'ai_daily_briefing') {
  const { currentSchool } = useSchool();

  return useQuery({
    queryKey: ['school-settings', key, currentSchool?.id],
    queryFn: async () => {
      if (!currentSchool) throw new Error('Escola não selecionada');

      const { data, error } = await supabase
        .from('school_settings')
        .select('*')
        .eq('key', key)
        .eq('school_id', currentSchool.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.value || null;
    },
    enabled: !!currentSchool,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
```

### Componentes de UI

**Severidade de Evasão**:
```typescript
function getSeverityConfig(severity: SeverityLevel) {
  const configs = {
    low: { color: 'text-green-500', icon: TrendingDown, label: 'Baixo' },
    medium: { color: 'text-yellow-500', icon: AlertTriangle, label: 'Médio' },
    high: { color: 'text-orange-500', icon: AlertTriangle, label: 'Alto' },
    critical: { color: 'text-red-500', icon: XCircle, label: 'Crítico' },
  };
  return configs[severity];
}
```

**Prioridade de Ações**:
```typescript
function getPriorityConfig(priority: PriorityLevel) {
  const configs = {
    urgent: { variant: 'destructive', label: '⚠️ URGENTE' },
    high: { variant: 'destructive', label: '🔴 ALTA' },
    medium: { variant: 'default', label: '🟡 MÉDIA' },
    low: { variant: 'outline', label: '🟢 BAIXA' },
  };
  return configs[priority];
}
```

---

## ⚙️ Funcionamento Multi-Tenancy

### Filtragem de Dados por Escola

Todas as RPCs que fornecem dados para a IA **devem** filtrar por `school_id`:

**RPC: `get_evasion_risk_analytics`**
```sql
CREATE OR REPLACE FUNCTION get_evasion_risk_analytics(
  days_filter INTEGER DEFAULT 30,
  school_id_param UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  effective_school_id UUID;
BEGIN
  -- Obter escola do usuário se não fornecida
  IF school_id_param IS NULL THEN
    SELECT current_school_id INTO effective_school_id
    FROM profiles
    WHERE id = auth.uid();
  ELSE
    effective_school_id := school_id_param;
  END IF;

  -- Validar acesso
  IF NOT EXISTS (
    SELECT 1 FROM school_memberships
    WHERE user_id = auth.uid()
    AND school_id = effective_school_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado a esta escola';
  END IF;

  -- Retornar dados filtrados por escola
  RETURN (
    SELECT json_build_object(
      'students_at_risk_count', COUNT(*),
      'total_students', (SELECT COUNT(*) FROM profiles WHERE current_school_id = effective_school_id),
      -- ... outros campos
    )
    FROM profiles
    WHERE current_school_id = effective_school_id
    AND last_login < NOW() - INTERVAL '7 days'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**RPC: `get_post_read_analytics`**
```sql
CREATE OR REPLACE FUNCTION get_post_read_analytics(
  days_filter INTEGER DEFAULT 30,
  school_id_param UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  effective_school_id UUID;
BEGIN
  -- Lógica idêntica a get_evasion_risk_analytics
  -- Filtrar posts e leituras por school_id
  -- ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Edge Function: Obter `school_id` Correto

```typescript
// supabase/functions/generate-school-insights/index.ts
const { data: profile } = await supabase
  .from('profiles')
  .select('current_school_id')
  .eq('id', auth.userId)
  .single();

const schoolId = profile?.current_school_id;

// Chamar RPCs com school_id_param
const { data: evasionData } = await supabase.rpc('get_evasion_risk_analytics', {
  days_filter: 30,
  school_id_param: schoolId
});

const { data: postReadData } = await supabase.rpc('get_post_read_analytics', {
  days_filter: 30,
  school_id_param: schoolId
});

// Salvar insights com school_id correto
await supabase.from('school_settings').upsert({
  key: 'ai_daily_briefing',
  school_id: schoolId, // ⚠️ CRÍTICO
  value: insights,
  updated_at: new Date().toISOString()
});
```

---

## 🚨 Problemas Comuns e Soluções

### ❌ Problema: Insights de uma escola aparecem em outra

**Causa**: `school_id` não filtrado corretamente em `school_settings` ou RPCs.

**Solução**:
1. Verificar que `useSchoolSettings` filtra por `currentSchool.id`
2. Garantir que edge function salva com `school_id` correto
3. Validar que RPCs recebem e usam `school_id_param`

### ❌ Problema: IA retorna termos técnicos (ex: "students_at_risk_count")

**Causa**: Prompts não enfatizam linguagem natural suficientemente.

**Solução**: Adicionar "REGRA DE OURO: ZERO TERMOS TÉCNICOS" ao `systemPrompt` com exemplos explícitos.

### ❌ Problema: Botão "Gerar Novos Insights" sempre desabilitado

**Causa**: Comparação de timestamps incorreta.

**Solução**:
```typescript
const canGenerate = useMemo(() => {
  if (!lastRun) return true;
  const lastRunDate = new Date(lastRun);
  const now = new Date();
  const hoursSinceLastRun = (now.getTime() - lastRunDate.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastRun >= 24;
}, [lastRun]);
```

### ❌ Problema: Insights não incluem estratégias de captação

**Causa**: Prompt não exige explicitamente estratégia sazonal.

**Solução**: Atualizar `userPrompt` para:
```typescript
const userPrompt = `...
4. Estratégia de Captação: OBRIGATÓRIO incluir pelo menos UMA estratégia de captação de novos alunos baseada na época atual (DATA ATUAL: ${currentDate.toLocaleDateString('pt-BR')})
`;
```

---

## 📚 Arquivos Principais

| Arquivo | Descrição |
|---------|-----------|
| `src/components/admin/PredictiveInsightsDashboard.tsx` | Dashboard de insights |
| `src/hooks/useSchoolSettings.ts` | Hook para buscar configurações/insights |
| `supabase/functions/generate-school-insights/index.ts` | Edge function manual |
| `supabase/functions/generate-daily-briefing/index.ts` | Edge function automática (cron) |
| `src/pages/admin/AdminDashboard.tsx` | Dashboard principal (inclui insights) |

---

## 🔗 Documentação Relacionada

- [Arquitetura Multi-Tenancy](./multi-tenancy-architecture.md)
- [Dashboard de Impacto dos Koins](./koins-impact-dashboard.md)
- [Analytics Administrativos](./admin-analytics.md)

---

**⚠️ LEMBRE-SE**: Insights devem ser acionáveis e práticos para gestores escolares. NUNCA incluir termos técnicos ou sugestões de implementação de software. Sempre validar que dados são filtrados por `school_id`.
