# Dashboard Executivo de Impacto dos Koins

**Última atualização**: 2025-01-24  
**Status**: ✅ Implementado e Validado  
**Prioridade**: 🟡 IMPORTANTE

---

## 📋 Visão Geral

O **Dashboard Executivo de Impacto dos Koins** é uma ferramenta exclusiva para administradores que demonstra o **ROI educacional** do sistema de recompensas gamificado (Koins).

### Objetivos

✅ Medir engajamento de alunos através de Koins  
✅ Identificar Top 10 alunos mais engajados  
✅ Analisar itens mais resgatados  
✅ Visualizar linha do tempo de impacto  
✅ Acompanhar status de resgates pendentes/aprovados  
✅ Exportar relatório executivo para Excel (estilo Power BI)  

---

## 🏗️ Arquitetura de Dados

### Tabelas Utilizadas

#### 1. `profiles` (Alunos)
```sql
SELECT 
  id,
  name,
  koins,
  avatar,
  current_school_id
FROM profiles
WHERE current_school_id = :schoolId
AND id IN (
  SELECT user_id 
  FROM school_memberships 
  WHERE school_id = :schoolId 
  AND role = 'aluno'
);
```

#### 2. `koin_transactions` (Transações)
```sql
SELECT 
  id,
  user_id,
  amount,
  type, -- 'EARN', 'SPEND', 'BONUS'
  description,
  created_at,
  school_id
FROM koin_transactions
WHERE school_id = :schoolId
ORDER BY created_at DESC;
```

#### 3. `redemption_requests` (Resgates)
```sql
SELECT 
  rr.id,
  rr.student_id,
  rr.item_id,
  rr.status, -- 'pending', 'approved', 'rejected'
  rr.requested_at,
  rr.processed_at,
  ri.name AS item_name,
  ri.price_koins,
  p.name AS student_name
FROM redemption_requests rr
JOIN reward_items ri ON rr.item_id = ri.id
JOIN profiles p ON rr.student_id = p.id
WHERE rr.school_id = :schoolId;
```

---

## 📊 Métricas e KPIs

### 1. KPIs Principais

| Métrica | Cálculo | Descrição |
|---------|---------|-----------|
| **Total Koins em Circulação** | SUM(profiles.koins) | Koins atualmente com alunos |
| **Total Koins Acumulados** | SUM(transactions WHERE type='EARN') | Histórico total de Koins ganhos |
| **Total Koins Gastos** | SUM(transactions WHERE type='SPEND') | Histórico total de Koins resgatados |
| **Taxa de Engajamento** | (Alunos Ativos / Total Alunos) * 100% | Alunos com koins > 0 |
| **Koins Médios por Aluno** | Total Koins / Total Alunos | Média de Koins por aluno |
| **Item Mais Resgatado** | MAX(COUNT(redemptions GROUP BY item_id)) | Item mais popular |

**Código para calcular KPIs**:
```typescript
// src/utils/rewards-analytics.ts
export function calculateKoinKPIs(
  students: Profile[],
  transactions: KoinTransaction[],
  redemptions: RedemptionRequest[]
) {
  const totalKoinsInCirculation = students.reduce((sum, s) => sum + s.koins, 0);
  const totalKoinsEarned = transactions
    .filter(t => t.type === 'EARN')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalKoinsSpent = transactions
    .filter(t => t.type === 'SPEND')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const activeStudents = students.filter(s => s.koins > 0).length;
  const engagementRate = (activeStudents / students.length) * 100;
  const averageKoinsPerStudent = totalKoinsInCirculation / students.length;

  return {
    totalKoinsInCirculation,
    totalKoinsEarned,
    totalKoinsSpent,
    activeStudents,
    engagementRate,
    averageKoinsPerStudent,
  };
}
```

### 2. Ranking de Alunos (Top 10)

**Critérios de Ordenação**:
1. Total de Koins acumulados (histórico)
2. Total de Koins gastos (engajamento em resgates)
3. Saldo atual de Koins

**Código**:
```typescript
export function calculateTopStudents(
  students: Profile[],
  transactions: KoinTransaction[]
) {
  const studentsWithStats = students.map(student => {
    const earnedTransactions = transactions.filter(
      t => t.user_id === student.id && t.type === 'EARN'
    );
    const spentTransactions = transactions.filter(
      t => t.user_id === student.id && t.type === 'SPEND'
    );

    const totalEarned = earnedTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalSpent = spentTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      id: student.id,
      name: student.name,
      avatar: student.avatar,
      currentBalance: student.koins,
      totalEarned,
      totalSpent,
      isHighEngagement: totalEarned > 500 && totalSpent > 200,
    };
  });

  // Ordenar por total acumulado + gasto
  return studentsWithStats
    .sort((a, b) => (b.totalEarned + b.totalSpent) - (a.totalEarned + a.totalSpent))
    .slice(0, 10);
}
```

**Visual**: Cards com medalhas 🥇🥈🥉 para Top 3 e badge "Super Engajado" para alta atividade.

### 3. Análise de Itens Resgatados

**Métricas**:
- Item mais popular (por número de resgates)
- Item mais lucrativo (por Koins gastos)
- Taxa de conversão de resgates (aprovados / solicitados)

**Código**:
```typescript
export function analyzeRedemptions(
  redemptions: RedemptionRequest[],
  items: RewardItem[]
) {
  const itemStats = items.map(item => {
    const itemRedemptions = redemptions.filter(r => r.item_id === item.id);
    const totalRedemptions = itemRedemptions.length;
    const approvedRedemptions = itemRedemptions.filter(r => r.status === 'approved').length;
    const totalKoinsSpent = approvedRedemptions * item.price_koins;

    return {
      itemId: item.id,
      itemName: item.name,
      totalRedemptions,
      approvedRedemptions,
      totalKoinsSpent,
      conversionRate: totalRedemptions > 0 ? (approvedRedemptions / totalRedemptions) * 100 : 0,
    };
  });

  return itemStats.sort((a, b) => b.totalRedemptions - a.totalRedemptions);
}
```

### 4. Linha do Tempo de Impacto

**Gráfico**: Line chart mostrando evolução de Koins acumulados por mês.

**Código**:
```typescript
export function generateImpactTimeline(transactions: KoinTransaction[]) {
  const monthlyData: Record<string, number> = {};

  for (const transaction of transactions) {
    if (transaction.type === 'EARN') {
      const month = new Date(transaction.created_at).toISOString().slice(0, 7); // "2025-01"
      monthlyData[month] = (monthlyData[month] || 0) + transaction.amount;
    }
  }

  return Object.entries(monthlyData)
    .map(([month, koins]) => ({ month, koins }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
```

---

## 📊 Dashboard UI (Frontend)

### Localização

**Modal**: Aberto pelo botão no `AdminDashboard` → "Ver Dashboard de Koins"  
**Componente**: `src/components/admin/KoinImpactDashboard.tsx`

### Layout

```
┌─────────────────────────────────────────────────────┐
│  💰 Dashboard Executivo de Impacto dos Koins    [X] │
├─────────────────────────────────────────────────────┤
│  ┌───────────┐ ┌───────────┐ ┌───────────┐         │
│  │ 4,250 💰  │ │ 12,500 💰 │ │ 8,250 💰  │         │
│  │ Circulação│ │ Acumulados│ │ Gastos    │         │
│  └───────────┘ └───────────┘ └───────────┘         │
│                                                      │
│  🏆 Top 10 Alunos Mais Engajados                    │
│  ┌───────────────────────────────────────────────┐ │
│  │ 🥇 1º João Silva       2,500💰 | 1,800💰      │ │
│  │ 🥈 2º Ana Santos       2,100💰 | 1,600💰      │ │
│  │ 🥉 3º Maria Oliveira   1,950💰 | 1,400💰      │ │
│  │ 4º Pedro Costa         1,800💰 | 1,200💰      │ │
│  └───────────────────────────────────────────────┘ │
│                                                      │
│  📊 Itens Mais Resgatados                           │
│  ┌───────────────────────────────────────────────┐ │
│  │ 1. Caderno Personalizado     42 resgates      │ │
│  │ 2. Vale-Lanche               38 resgates      │ │
│  │ 3. Caneta Especial           35 resgates      │ │
│  └───────────────────────────────────────────────┘ │
│                                                      │
│  📈 Linha do Tempo de Impacto                       │
│  [Line Chart: Koins acumulados por mês]            │
│                                                      │
│  📋 Status de Resgates                              │
│  Pendentes: 8  |  Aprovados: 156  |  Rejeitados: 4 │
│                                                      │
│  [Exportar para Excel (Power BI)]                   │
└─────────────────────────────────────────────────────┘
```

### Código do Componente

```typescript
// src/components/admin/KoinImpactDashboard.tsx
import { useSchool } from '@/contexts/SchoolContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { calculateKoinKPIs, calculateTopStudents } from '@/utils/rewards-analytics';

export function KoinImpactDashboard() {
  const { currentSchool } = useSchool();

  // Fetch students
  const { data: students } = useQuery({
    queryKey: ['students', currentSchool?.id],
    queryFn: async () => {
      const { data: memberships } = await supabase
        .from('school_memberships')
        .select('user_id')
        .eq('school_id', currentSchool.id)
        .eq('role', 'aluno');

      const studentIds = memberships?.map(m => m.user_id) || [];
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .in('id', studentIds);

      return data || [];
    },
    enabled: !!currentSchool,
  });

  // Fetch transactions
  const { data: transactions } = useQuery({
    queryKey: ['transactions', currentSchool?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('koin_transactions')
        .select('*')
        .eq('school_id', currentSchool.id)
        .order('created_at', { ascending: false });

      return data || [];
    },
    enabled: !!currentSchool,
  });

  const kpis = calculateKoinKPIs(students, transactions, []);
  const topStudents = calculateTopStudents(students, transactions);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>💰 Dashboard Executivo de Impacto dos Koins</DialogTitle>
        </DialogHeader>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{kpis.totalKoinsInCirculation} 💰</CardTitle>
              <CardDescription>Em Circulação</CardDescription>
            </CardHeader>
          </Card>
          {/* ... outros KPIs */}
        </div>

        {/* Top 10 Students */}
        <Card>
          <CardHeader>
            <CardTitle>🏆 Top 10 Alunos Mais Engajados</CardTitle>
          </CardHeader>
          <CardContent>
            {topStudents.map((student, index) => (
              <div key={student.id} className="flex items-center gap-4 py-2">
                {index < 3 && <span className="text-2xl">{['🥇', '🥈', '🥉'][index]}</span>}
                <Avatar src={student.avatar} name={student.name} />
                <div className="flex-1">
                  <p className="font-semibold">{student.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {student.totalEarned}💰 acumulados | {student.totalSpent}💰 gastos
                  </p>
                </div>
                {student.isHighEngagement && (
                  <Badge variant="default">Super Engajado 🔥</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ... outros componentes */}
      </DialogContent>
    </Dialog>
  );
}
```

---

## 📄 Export Excel (Power BI Style)

### Funcionalidade

Gera relatório executivo com **6 abas temáticas**:

1. **Resumo Executivo**: KPIs principais
2. **Top Alunos**: Ranking com detalhes
3. **Transações**: Histórico completo de transações
4. **Itens Mais Desejados**: Análise de resgates
5. **Linha do Tempo**: Evolução mensal de Koins
6. **Status de Resgates**: Pendentes, aprovados, rejeitados

**Código**:
```typescript
// src/utils/export-koins-impact-report.ts
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export async function exportKoinsImpactReport(
  students: Profile[],
  transactions: KoinTransaction[],
  redemptions: RedemptionRequest[],
  schoolName: string
) {
  const workbook = new ExcelJS.Workbook();

  // Aba 1: Resumo Executivo
  const summarySheet = workbook.addWorksheet('Resumo Executivo');
  summarySheet.columns = [
    { header: 'Métrica', key: 'metric', width: 40 },
    { header: 'Valor', key: 'value', width: 20 },
  ];

  const kpis = calculateKoinKPIs(students, transactions, redemptions);
  summarySheet.addRow({ metric: 'Total de Koins em Circulação', value: kpis.totalKoinsInCirculation });
  summarySheet.addRow({ metric: 'Total de Koins Acumulados', value: kpis.totalKoinsEarned });
  summarySheet.addRow({ metric: 'Total de Koins Gastos', value: kpis.totalKoinsSpent });
  summarySheet.addRow({ metric: 'Taxa de Engajamento', value: `${kpis.engagementRate.toFixed(2)}%` });

  // Aba 2: Top Alunos
  const topSheet = workbook.addWorksheet('Top Alunos');
  topSheet.columns = [
    { header: 'Posição', key: 'rank', width: 10 },
    { header: 'Nome', key: 'name', width: 30 },
    { header: 'Koins Acumulados', key: 'earned', width: 20 },
    { header: 'Koins Gastos', key: 'spent', width: 20 },
    { header: 'Saldo Atual', key: 'balance', width: 20 },
  ];

  const topStudents = calculateTopStudents(students, transactions);
  topStudents.forEach((student, index) => {
    topSheet.addRow({
      rank: index + 1,
      name: student.name,
      earned: student.totalEarned,
      spent: student.totalSpent,
      balance: student.currentBalance,
    });
  });

  // ... outras abas

  // Salvar arquivo
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  saveAs(blob, `impacto-koins-${schoolName}-${Date.now()}.xlsx`);
}
```

**Formatação Condicional**:
- Valores > 1000 Koins: Verde
- Valores 500-1000 Koins: Amarelo
- Valores < 500 Koins: Vermelho
- Top 3 alunos: Fundo dourado

---

## ⚙️ Funcionamento Multi-Tenancy

### Isolamento de Dados por Escola

Todas as queries filtram por `currentSchool.id`:

```typescript
// Fetch students
const { data: memberships } = await supabase
  .from('school_memberships')
  .select('user_id')
  .eq('school_id', currentSchool.id) // ⚠️ CRÍTICO
  .eq('role', 'aluno');

// Fetch transactions
const { data: transactions } = await supabase
  .from('koin_transactions')
  .select('*')
  .eq('school_id', currentSchool.id) // ⚠️ CRÍTICO
  .order('created_at', { ascending: false });

// Fetch redemptions
const { data: redemptions } = await supabase
  .from('redemption_requests')
  .select('*, reward_items(*), profiles(*)')
  .eq('school_id', currentSchool.id); // ⚠️ CRÍTICO
```

**Garantia de Segurança**: RLS policies asseguram que mesmo que o frontend envie `school_id` errado, o backend bloqueia acesso.

---

## 🚨 Problemas Comuns e Soluções

### ❌ Problema: KPIs mostram dados de todas as escolas

**Causa**: Filtro por `school_id` ausente em queries.

**Solução**: Adicionar `.eq('school_id', currentSchool.id)` em todas as queries.

### ❌ Problema: Ranking de alunos está incorreto

**Causa**: Cálculo de "total acumulado" contando apenas saldo atual.

**Solução**: Somar TODAS as transações de tipo `EARN`, não apenas `koins` atual.

### ❌ Problema: Export Excel não inclui dados

**Causa**: Dados não foram passados corretamente para a função de export.

**Solução**: Verificar que `students`, `transactions`, e `redemptions` estão populados antes de chamar `exportKoinsImpactReport`.

---

## 📚 Arquivos Principais

| Arquivo | Descrição |
|---------|-----------|
| `src/components/admin/KoinImpactDashboard.tsx` | Dashboard principal |
| `src/utils/rewards-analytics.ts` | Funções de cálculo de KPIs |
| `src/utils/export-koins-impact-report.ts` | Export Excel |
| `src/pages/admin/AdminDashboard.tsx` | Botão para abrir dashboard |

---

## 🔗 Documentação Relacionada

- [Arquitetura Multi-Tenancy](./multi-tenancy-architecture.md)
- [Sistema de Gamificação](./gamification-system.md)
- [Insights Preditivos com IA](./ai-predictive-insights.md)

---

**⚠️ LEMBRE-SE**: Dashboard é exclusivo para administradores. Sempre filtrar dados por `school_id` para garantir isolamento multi-tenant. Métricas devem ser acionáveis e demonstrar o ROI educacional do sistema de Koins.
