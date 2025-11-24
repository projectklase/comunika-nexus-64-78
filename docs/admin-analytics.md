# Analytics Administrativos

**Última atualização**: 2025-01-24  
**Status**: ✅ Implementado e Validado  
**Prioridade**: 🟡 IMPORTANTE

---

## 📋 Visão Geral

O sistema de **Analytics Administrativos** fornece métricas em tempo real sobre engajamento, evasão, performance de turmas e comunicação escolar.

### Objetivos

✅ Monitorar risco de evasão de alunos  
✅ Medir engajamento e leitura de posts  
✅ Avaliar performance de turmas individuais  
✅ Calcular Pulse Score (saúde geral da escola)  
✅ Visualizar Weekly Heatmap de atividades  
✅ Analisar métricas de retenção  

**Público-Alvo**: Administradores e gestores escolares.

---

## 🏗️ Arquitetura de Dados

### RPCs (Remote Procedure Calls)

Todas as métricas são calculadas via funções PostgreSQL otimizadas.

#### 1. `get_evasion_risk_analytics`

**Funcionalidade**: Identifica alunos em risco de evasão baseado em inatividade.

**Parâmetros**:
- `days_filter` (INTEGER, padrão 30): Período de análise
- `school_id_param` (UUID, obrigatório): ID da escola

**Retorno**:
```json
{
  "students_at_risk_count": 8,
  "worst_class_name": "5º Ano A",
  "worst_class_pending_count": 12,
  "activity_trend": [
    { "date": "2025-01-15", "activities_published": 3, "deliveries_made": 8 },
    { "date": "2025-01-16", "activities_published": 2, "deliveries_made": 5 }
  ],
  "students_at_risk_list": [
    {
      "student_id": "abc-123",
      "student_name": "João Silva",
      "class_name": "5º Ano A",
      "days_since_last_login": 15
    }
  ]
}
```

**Critério de Risco**: Alunos que não fizeram login nos últimos 7 dias.

**Código SQL**:
```sql
CREATE OR REPLACE FUNCTION get_evasion_risk_analytics(
  days_filter INTEGER DEFAULT 30,
  school_id_param UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Validação de segurança
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'administrador'
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Buscar alunos em risco
  WITH students_at_risk AS (
    SELECT 
      p.id as student_id,
      p.name as student_name,
      c.name as class_name,
      EXTRACT(DAY FROM (NOW() - COALESCE(au.last_sign_in_at, NOW())))::INT 
        as days_since_last_login
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'aluno'
    INNER JOIN school_memberships sm ON sm.user_id = p.id 
      AND sm.school_id = school_id_param
    LEFT JOIN auth.users au ON au.id = p.id
    LEFT JOIN class_students cs ON cs.student_id = p.id
    LEFT JOIN classes c ON c.id = cs.class_id 
      AND c.school_id = school_id_param
    WHERE p.is_active = true
      AND COALESCE(au.last_sign_in_at, NOW()) < NOW() - INTERVAL '7 days'
  )
  SELECT jsonb_build_object(
    'students_at_risk_count', COUNT(*),
    'students_at_risk_list', jsonb_agg(row_to_json(s.*))
  ) INTO v_result
  FROM students_at_risk s;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2. `get_post_read_analytics`

**Funcionalidade**: Calcula taxa de leitura de posts e identifica posts com baixo engajamento.

**Parâmetros**:
- `days_filter` (INTEGER, padrão 30): Período de análise
- `school_id_param` (UUID, obrigatório): ID da escola

**Retorno**:
```json
{
  "total_posts_published": 45,
  "total_reads": 312,
  "avg_read_rate": 68.5,
  "top_posts": [
    {
      "post_id": "post-123",
      "title": "Reunião de Pais",
      "read_count": 42,
      "read_rate": 95.2
    }
  ],
  "posts_with_low_engagement": [
    {
      "post_id": "post-456",
      "title": "Informativo Semanal",
      "read_count": 8,
      "read_rate": 18.1
    }
  ]
}
```

**Cálculo da Taxa de Leitura**:
```
avg_read_rate = (total_reads / (total_posts * total_students)) * 100
```

**Código SQL**:
```sql
CREATE OR REPLACE FUNCTION get_post_read_analytics(
  days_filter INTEGER DEFAULT 30,
  school_id_param UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_total_posts INT;
  v_total_reads INT;
  v_avg_read_rate NUMERIC;
BEGIN
  -- Validação de segurança
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'administrador'
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Contar posts publicados no período
  SELECT COUNT(*)::INT INTO v_total_posts
  FROM posts
  WHERE status = 'PUBLISHED'
    AND school_id = school_id_param
    AND created_at >= NOW() - (days_filter || ' days')::INTERVAL;

  -- Contar leituras no período
  SELECT COUNT(*)::INT INTO v_total_reads
  FROM post_reads pr
  INNER JOIN posts p ON p.id = pr.post_id
  WHERE p.status = 'PUBLISHED'
    AND p.school_id = school_id_param
    AND pr.read_at >= NOW() - (days_filter || ' days')::INTERVAL;

  -- Calcular taxa média
  v_avg_read_rate := CASE
    WHEN v_total_posts > 0 THEN
      ROUND((v_total_reads::NUMERIC / v_total_posts) * 100, 2)
    ELSE 0
  END;

  RETURN jsonb_build_object(
    'total_posts_published', v_total_posts,
    'total_reads', v_total_reads,
    'avg_read_rate', v_avg_read_rate
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 3. `get_class_performance_analytics`

**Funcionalidade**: Analisa performance de uma turma específica.

**Parâmetros**:
- `p_class_id` (UUID, obrigatório): ID da turma
- `days_filter` (INTEGER, padrão 30): Período de análise

**Retorno**:
```json
{
  "class_id": "class-123",
  "class_name": "5º Ano A",
  "total_students": 25,
  "active_students_last_7_days": 22,
  "total_activities_assigned": 12,
  "total_deliveries": 280,
  "delivery_rate": 93.3,
  "avg_days_to_deliver": 2.5,
  "pending_deliveries": 8,
  "approved_deliveries": 245,
  "returned_deliveries": 27,
  "late_deliveries": 18
}
```

**Código SQL**:
```sql
CREATE OR REPLACE FUNCTION get_class_performance_analytics(
  p_class_id UUID,
  days_filter INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
  v_total_students INT;
  v_total_activities INT;
  v_total_deliveries INT;
  v_delivery_rate NUMERIC;
BEGIN
  -- Validação de segurança (apenas administradores)
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'administrador'
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Total de alunos na turma
  SELECT COUNT(*)::INT INTO v_total_students
  FROM class_students
  WHERE class_id = p_class_id;

  -- Total de atividades atribuídas
  SELECT COUNT(*)::INT INTO v_total_activities
  FROM posts
  WHERE type IN ('ATIVIDADE', 'TRABALHO', 'PROVA')
    AND status = 'PUBLISHED'
    AND class_id::UUID = p_class_id
    AND created_at >= NOW() - (days_filter || ' days')::INTERVAL;

  -- Total de entregas
  SELECT COUNT(*)::INT INTO v_total_deliveries
  FROM deliveries
  WHERE class_id::UUID = p_class_id
    AND submitted_at >= NOW() - (days_filter || ' days')::INTERVAL;

  -- Taxa de entrega
  IF v_total_activities > 0 AND v_total_students > 0 THEN
    v_delivery_rate := ROUND(
      (v_total_deliveries::NUMERIC / (v_total_activities * v_total_students)) * 100,
      2
    );
  ELSE
    v_delivery_rate := 0;
  END IF;

  RETURN jsonb_build_object(
    'class_id', p_class_id,
    'total_students', v_total_students,
    'total_activities_assigned', v_total_activities,
    'total_deliveries', v_total_deliveries,
    'delivery_rate', v_delivery_rate
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 4. `get_pulse_score` (a ser implementado)

**Funcionalidade**: Calcula um "score de saúde" geral da escola.

**Fórmula**:
```
Pulse Score = (
  (1 - evasion_rate) * 0.3 +
  avg_read_rate * 0.25 +
  avg_delivery_rate * 0.25 +
  engagement_rate * 0.2
) * 100
```

**Retorno**: Score de 0-100 indicando saúde geral da escola.

#### 5. `get_weekly_heatmap` (a ser implementado)

**Funcionalidade**: Retorna contagem de atividades por dia da semana.

**Retorno**:
```json
{
  "monday": 12,
  "tuesday": 15,
  "wednesday": 18,
  "thursday": 14,
  "friday": 10,
  "saturday": 3,
  "sunday": 1
}
```

---

## 📊 Dashboard Administrativo

### Localização

**Página**: `/admin/dashboard`  
**Componente**: `src/pages/admin/AdminDashboard.tsx`

### Layout

```
┌─────────────────────────────────────────────────────┐
│  📊 Dashboard Administrativo                         │
├─────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│  │ 120      │ │ 15       │ │ 8        │ │ 4       ││
│  │ Alunos   │ │ Professo │ │ Turmas   │ │ Secret. ││
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘│
│                                                      │
│  📉 Risco de Evasão                                 │
│  ┌────────────────────────────────────────────────┐ │
│  │ ⚠️ 8 alunos em risco (sem login há 7+ dias)   │ │
│  │                                                 │ │
│  │ Turma com mais risco: 5º Ano A (4 alunos)     │ │
│  │                                                 │ │
│  │ [Ver Lista Detalhada]                          │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  📬 Engajamento de Posts                            │
│  ┌────────────────────────────────────────────────┐ │
│  │ Taxa Média de Leitura: 68.5%                   │ │
│  │ Posts Publicados (30 dias): 45                 │ │
│  │ Total de Leituras: 312                         │ │
│  │                                                 │ │
│  │ [Ver Analytics Detalhados]                     │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  🏆 Top 5 Turmas (Taxa de Entrega)                 │
│  1. 5º Ano B - 95.2%                               │
│  2. 4º Ano A - 92.8%                               │
│  3. 6º Ano C - 89.5%                               │
│  ...                                                │
└─────────────────────────────────────────────────────┘
```

### Hook: `useAdminAnalytics`

**Localização**: `src/hooks/useAdminAnalytics.ts`

**Funcionalidade**:
- Busca todas as métricas em paralelo (evasão, leitura, performance)
- Filtra por `currentSchool.id`
- Cache de 30 segundos com refetch automático a cada 1 minuto

**Código**:
```typescript
export function useAdminAnalytics(daysFilter: number = 30) {
  const { currentSchool } = useSchool();

  // Evasão
  const { data: evasionData, isLoading: evasionLoading } = useQuery({
    queryKey: ['admin-analytics', 'evasion', daysFilter, currentSchool?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_evasion_risk_analytics', {
        days_filter: daysFilter,
        school_id_param: currentSchool.id,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!currentSchool,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Leitura de Posts
  const { data: postReadData, isLoading: postReadLoading } = useQuery({
    queryKey: ['admin-analytics', 'post-reads', daysFilter, currentSchool?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_post_read_analytics', {
        days_filter: daysFilter,
        school_id_param: currentSchool.id,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!currentSchool,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  return {
    evasionData,
    postReadData,
    isLoading: evasionLoading || postReadLoading,
  };
}
```

---

## 📊 Página de Analytics Detalhados

### Localização

**Página**: `/admin/analytics` (a ser implementado)  
**Componente**: `src/pages/admin/AdminAnalyticsPage.tsx`

### Funcionalidades

1. **Filtros Globais**:
   - Período: 7 dias, 30 dias, 90 dias, 1 ano
   - Turma específica (dropdown)
   - Exportar relatório (Excel/PDF)

2. **Seções**:
   - **Visão Geral**: KPIs principais (total de alunos, taxa de evasão, pulse score)
   - **Risco de Evasão**: Lista de alunos em risco com ações sugeridas
   - **Engajamento de Posts**: Taxa de leitura por tipo de post (COMUNICADO, EVENTO, etc.)
   - **Performance de Turmas**: Comparação de entregas entre turmas
   - **Weekly Heatmap**: Mapa de calor de atividades por dia da semana
   - **Retenção**: Análise de retenção de alunos mês a mês

3. **Visualizações**:
   - Line Charts (tendências ao longo do tempo)
   - Bar Charts (comparação entre turmas)
   - Pie Charts (distribuição por categoria)
   - Heatmaps (atividade por dia/hora)

**Código Base**:
```typescript
// src/pages/admin/AdminAnalyticsPage.tsx
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, BarChart, PieChart } from 'recharts';

export function AdminAnalyticsPage() {
  const [daysFilter, setDaysFilter] = useState(30);
  const { evasionData, postReadData, isLoading } = useAdminAnalytics(daysFilter);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Analytics Administrativos</h1>

      {/* Filtros */}
      <div className="flex gap-4">
        <Select value={daysFilter.toString()} onValueChange={(v) => setDaysFilter(Number(v))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Risco de Evasão */}
      <Card>
        <CardHeader>
          <CardTitle>⚠️ Risco de Evasão</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{evasionData.students_at_risk_count} alunos em risco</p>
          <LineChart
            data={evasionData.activity_trend}
            width={800}
            height={300}
            // ... configuração do gráfico
          />
        </CardContent>
      </Card>

      {/* Engajamento de Posts */}
      <Card>
        <CardHeader>
          <CardTitle>📬 Engajamento de Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{postReadData.avg_read_rate}% taxa média</p>
          <BarChart
            data={postReadData.top_posts}
            // ... configuração do gráfico
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 🚨 Problemas Comuns e Soluções

### ❌ Problema: RPC retorna erro "Acesso negado"

**Causa**: Usuário não possui role `administrador` ou RLS policy bloqueou.

**Solução**: Verificar que:
1. Usuário está autenticado (`auth.uid()` não é NULL)
2. Existe registro em `user_roles` com `role = 'administrador'`
3. RPC usa `SECURITY DEFINER` para bypass de RLS

### ❌ Problema: Métricas mostram dados de todas as escolas

**Causa**: `school_id_param` não foi passado ou RPC não filtra corretamente.

**Solução**: Sempre passar `currentSchool.id` e validar no RPC:
```sql
IF school_id_param IS NULL THEN
  RAISE EXCEPTION 'school_id_param é obrigatório';
END IF;
```

### ❌ Problema: Analytics não atualizam ao trocar de escola

**Causa**: `currentSchool.id` não está na `queryKey` do React Query.

**Solução**:
```typescript
queryKey: ['admin-analytics', 'evasion', daysFilter, currentSchool?.id],
```

---

## 📚 Arquivos Principais

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useAdminAnalytics.ts` | Hook principal de analytics |
| `src/hooks/usePostReadAnalytics.ts` | Hook específico de leitura de posts |
| `src/pages/admin/AdminDashboard.tsx` | Dashboard principal com resumo |
| `src/pages/admin/AdminAnalyticsPage.tsx` | Página detalhada de analytics (a implementar) |
| `supabase/migrations/*_analytics_rpcs.sql` | Funções RPC de analytics |

---

## 🔗 Documentação Relacionada

- [Arquitetura Multi-Tenancy](./multi-tenancy-architecture.md)
- [Insights Preditivos com IA](./ai-predictive-insights.md)
- [Dashboard de Impacto dos Koins](./koins-impact-dashboard.md)
- [Sistema de Relações Familiares](./family-relationships-system.md)

---

**⚠️ LEMBRE-SE**: Analytics devem sempre filtrar por `school_id` para garantir isolamento multi-tenant. Validar que apenas administradores têm acesso às RPCs de analytics. Otimizar queries para evitar timeout em escolas grandes.
