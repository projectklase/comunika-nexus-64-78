# Sistema de Relações Familiares

**Última atualização**: 2025-01-24  
**Status**: ✅ Implementado e Validado  
**Prioridade**: 🔴 CRÍTICA

---

## 📋 Visão Geral

O sistema de **Relações Familiares** permite à escola mapear e visualizar vínculos familiares entre alunos, identificar famílias com múltiplos estudantes, e usar essas informações para campanhas de captação e estratégias de comunicação direcionadas.

### Objetivos

✅ Mapear relações familiares (irmãos, primos, tios, padrinhos)  
✅ Detectar automaticamente responsáveis duplicados  
✅ Inferir relacionamentos entre alunos baseado em responsáveis compartilhados  
✅ Visualizar árvore genealógica interativa  
✅ Exportar relatórios executivos de vínculos familiares  
✅ Editar alunos contextualmente sem sair da página de relações  

---

## 🏗️ Arquitetura de Dados

### 1. Campo JSONB: `student_notes.familyRelationships`

Armazena relacionamentos **aluno ↔ aluno**:

```typescript
interface FamilyRelationship {
  relatedStudentId: string;        // ID do aluno relacionado
  relatedStudentName: string;      // Nome do aluno relacionado
  relationshipType: 'SIBLING' | 'COUSIN' | 'UNCLE_NEPHEW' | 'OTHER';
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW'; // Nível de confiança da inferência
  inferredFrom?: string;           // Origem da inferência (ex: "Helena Maria (MÃE)")
  createdAt: string;               // Timestamp de criação
}
```

**Exemplo**:
```json
{
  "familyRelationships": [
    {
      "relatedStudentId": "abc-123",
      "relatedStudentName": "João Silva",
      "relationshipType": "SIBLING",
      "confidence": "HIGH",
      "inferredFrom": "Helena Maria (MÃE)",
      "createdAt": "2025-01-20T10:30:00Z"
    },
    {
      "relatedStudentId": "def-456",
      "relatedStudentName": "Maria Silva",
      "relationshipType": "COUSIN",
      "confidence": "MEDIUM",
      "inferredFrom": "Transitivo via João Silva",
      "createdAt": "2025-01-21T15:45:00Z"
    }
  ]
}
```

### 2. Campo JSONB: `student_notes.guardianRelationships` (NOVO)

Armazena relacionamentos **responsável → aluno** (ex: padrinhos):

```typescript
interface GuardianRelationship {
  guardianId: string;              // ID do responsável (de outra família)
  guardianName: string;            // Nome do responsável
  guardianOf: string;              // ID do aluno (este aluno)
  relationshipType: 'GODPARENT' | 'EXTENDED_FAMILY' | 'OTHER';
  customRelationship?: string;     // Descrição customizada
  createdAt: string;               // Timestamp de criação
}
```

**Exemplo**:
```json
{
  "guardianRelationships": [
    {
      "guardianId": "xyz-789",
      "guardianName": "Helena Maria",
      "guardianOf": "abc-123",
      "relationshipType": "GODPARENT",
      "createdAt": "2025-01-20T10:30:00Z"
    }
  ]
}
```

**⚠️ IMPORTANTE**: `GODPARENT_GODCHILD` só deve existir em `guardianRelationships`, NUNCA em `familyRelationships`.

### 3. Função RPC: `get_family_metrics`

Retorna métricas agregadas de vínculos familiares da escola.

**Query**:
```sql
SELECT get_family_metrics('school-uuid-here');
```

**Retorno**:
```json
{
  "totalFamilies": 45,
  "familiesWithMultipleStudents": 12,
  "averageStudentsPerFamily": 1.8,
  "relationshipDistribution": {
    "SIBLING": 24,
    "COUSIN": 8,
    "UNCLE_NEPHEW": 4,
    "OTHER": 2
  },
  "familyGroups": [
    {
      "guardian_id": "xyz-789",
      "guardian_name": "Helena Maria",
      "guardian_email": "helena@email.com",
      "guardian_phone": "(11) 98765-4321",
      "student_count": 3,
      "students": [
        {
          "id": "abc-123",
          "name": "João Silva",
          "class_name": "5º Ano A",
          "avatar": "https://..."
        },
        {
          "id": "def-456",
          "name": "Ana Silva",
          "class_name": "3º Ano B",
          "avatar": "https://..."
        }
      ]
    }
  ]
}
```

---

## ⚙️ Funcionamento do Sistema

### 1. Detecção Automática de Responsáveis Duplicados

Quando um usuário cadastra um aluno e preenche os dados do responsável, o sistema:

1. **Verifica se já existe responsável com mesmo email ou telefone**
2. **Abre modal `SiblingGuardianSuggestion`** mostrando:
   - Responsável existente encontrado
   - Outros alunos vinculados a esse responsável
   - Opções: "Copiar dados do responsável" ou "Ignorar"

3. **Se o usuário copiar os dados**:
   - Modal pergunta: "Qual o grau de parentesco entre [Responsável] e [Novo Aluno]?"
   - Opções: MÃE, PAI, TIO, TIA, AVÔ, AVÓ, PADRINHO, MADRINHA, RESPONSÁVEL LEGAL, OUTRO

4. **Sistema infere automaticamente relacionamento aluno↔aluno**:
   - Se ambos têm a mesma pessoa como MÃE ou PAI → SIBLING (HIGH confidence)
   - Se um tem MÃE e outro TIA → COUSIN (HIGH confidence)
   - Se um tem MÃE e outro AVÓ → UNCLE_NEPHEW (MEDIUM confidence)

**Código**:
```typescript
// src/components/admin/StudentFormSteps.tsx
const inferStudentRelationship = (
  guardianType: string, // 'MÃE', 'PAI', 'TIO', etc.
  existingStudentId: string,
  existingStudentName: string
): FamilyRelationship | null => {
  // Matriz de inferência
  const inferenceMatrix = {
    'MÃE-MÃE': { type: 'SIBLING', confidence: 'HIGH' },
    'PAI-PAI': { type: 'SIBLING', confidence: 'HIGH' },
    'MÃE-TIA': { type: 'COUSIN', confidence: 'HIGH' },
    'MÃE-AVÓ': { type: 'UNCLE_NEPHEW', confidence: 'MEDIUM' },
    // ... outras combinações
  };

  const key = `${guardianType}-${existingGuardianType}`;
  const inference = inferenceMatrix[key];

  if (!inference) return null;

  return {
    relatedStudentId: existingStudentId,
    relatedStudentName: existingStudentName,
    relationshipType: inference.type,
    confidence: inference.confidence,
    inferredFrom: `${guardianName} (${guardianType})`,
    createdAt: new Date().toISOString(),
  };
};
```

### 2. Relacionamentos Bidirecionais

Quando um relacionamento é registrado, **ambos os alunos recebem o registro**:

```typescript
// Registrar relacionamento Ana → João (SIBLING)
await supabase.from('profiles').update({
  student_notes: {
    ...anaProfile.student_notes,
    familyRelationships: [
      ...anaProfile.student_notes.familyRelationships,
      {
        relatedStudentId: joaoId,
        relatedStudentName: 'João Silva',
        relationshipType: 'SIBLING',
        confidence: 'HIGH',
        createdAt: new Date().toISOString(),
      }
    ]
  }
}).eq('id', anaId);

// Registrar relacionamento recíproco João → Ana (SIBLING)
await supabase.from('profiles').update({
  student_notes: {
    ...joaoProfile.student_notes,
    familyRelationships: [
      ...joaoProfile.student_notes.familyRelationships,
      {
        relatedStudentId: anaId,
        relatedStudentName: 'Ana Silva',
        relationshipType: 'SIBLING',
        confidence: 'HIGH',
        createdAt: new Date().toISOString(),
      }
    ]
  }
}).eq('id', joaoId);
```

### 3. Inferência Transitiva de Relacionamentos

**Problema**: Ana é irmã de João. João é primo de Maria. Logo, Ana também deveria ser prima de Maria.

**Solução**: Sistema de inferência transitiva usando regras lógicas.

#### Matriz de Regras Transitivas

```typescript
// src/utils/transitive-relationship-rules.ts
export const TRANSITIVE_RULES = {
  'SIBLING-SIBLING': 'SIBLING',        // Irmão do irmão = Irmão
  'SIBLING-COUSIN': 'COUSIN',          // Irmão do primo = Primo
  'COUSIN-COUSIN': 'COUSIN',           // Primo do primo = Primo
  'SIBLING-UNCLE_NEPHEW': 'UNCLE_NEPHEW', // Irmão do tio = Tio
  // ... outras regras
};
```

#### Função de Propagação

```typescript
// src/utils/propagate-relationships.ts
export function propagateRelationships(students: Student[]): Student[] {
  const updatedStudents = [...students];
  let hasChanges = true;

  while (hasChanges) {
    hasChanges = false;

    for (const student of updatedStudents) {
      const existingRelationships = student.student_notes?.familyRelationships || [];

      for (const rel of existingRelationships) {
        const relatedStudent = updatedStudents.find(s => s.id === rel.relatedStudentId);
        if (!relatedStudent) continue;

        const relatedRels = relatedStudent.student_notes?.familyRelationships || [];

        for (const transitiveRel of relatedRels) {
          // Não criar relacionamento consigo mesmo
          if (transitiveRel.relatedStudentId === student.id) continue;

          // Verificar se já existe
          const alreadyExists = existingRelationships.some(
            r => r.relatedStudentId === transitiveRel.relatedStudentId
          );
          if (alreadyExists) continue;

          // Aplicar regra transitiva
          const rule = `${rel.relationshipType}-${transitiveRel.relationshipType}`;
          const newType = TRANSITIVE_RULES[rule];

          if (newType) {
            existingRelationships.push({
              relatedStudentId: transitiveRel.relatedStudentId,
              relatedStudentName: transitiveRel.relatedStudentName,
              relationshipType: newType,
              confidence: 'MEDIUM',
              inferredFrom: `Transitivo via ${rel.relatedStudentName}`,
              createdAt: new Date().toISOString(),
            });
            hasChanges = true;
          }
        }
      }

      student.student_notes = {
        ...student.student_notes,
        familyRelationships: existingRelationships,
      };
    }
  }

  return updatedStudents;
}
```

#### Hook React: `useTransitiveInference`

```typescript
// src/hooks/useTransitiveInference.ts
export function useTransitiveInference() {
  const [isProcessing, setIsProcessing] = useState(false);

  const runTransitiveInference = async (schoolId: string) => {
    setIsProcessing(true);

    // 1. Buscar todos os alunos da escola
    const { data: students } = await supabase
      .from('profiles')
      .select('*')
      .eq('current_school_id', schoolId);

    // 2. Propagar relacionamentos
    const updatedStudents = propagateRelationships(students);

    // 3. Salvar mudanças no banco
    for (const student of updatedStudents) {
      await supabase.from('profiles').update({
        student_notes: student.student_notes,
      }).eq('id', student.id);
    }

    setIsProcessing(false);
  };

  return { runTransitiveInference, isProcessing };
}
```

**Uso no Admin**:
```typescript
// src/pages/admin/FamilyRelationsPage.tsx
const { runTransitiveInference, isProcessing } = useTransitiveInference();

<Button
  onClick={() => runTransitiveInference(currentSchool.id)}
  disabled={isProcessing}
>
  {isProcessing ? 'Processando...' : 'Corrigir Relacionamentos'}
</Button>
```

---

## 📊 Página de Relações Familiares

### Localização

**Rota**: `/admin/relacoes-familiares`  
**Componente**: `src/pages/admin/FamilyRelationsPage.tsx`

### Layout

```
┌─────────────────────────────────────────────────────┐
│  💛 Relações Familiares                    [🔧] [📊]│
│  Mapeamento de vínculos familiares entre alunos     │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │ 45 Famílias │ │ 12 c/ +1    │ │ 1.8 Média   │   │
│  └─────────────┘ └─────────────┘ └─────────────┘   │
├─────────────────────────────────────────────────────┤
│  [Lista] [Árvore Genealógica]                       │
│                                                      │
│  (Conteúdo da aba selecionada)                      │
└─────────────────────────────────────────────────────┘
```

### Aba: Lista

**Funcionalidades**:
- ✅ Cards de famílias ordenados por número de alunos
- ✅ Busca por nome do responsável, aluno ou email
- ✅ Filtros por número de alunos (slider)
- ✅ Sidebar de detalhes da família (ao clicar em "Ver Detalhes")
- ✅ Botão "Ver na Árvore" para trocar para aba de visualização
- ✅ Botão de edição de aluno (ícone lápis) na sidebar

**Código**:
```typescript
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="list">Lista</TabsTrigger>
    <TabsTrigger value="tree">Árvore Genealógica</TabsTrigger>
  </TabsList>

  <TabsContent value="list">
    <FamilyList
      families={filteredFamilies}
      onSelectFamily={(family) => {
        setSelectedFamily(family);
        setShowSidebar(true);
      }}
    />
  </TabsContent>

  <TabsContent value="tree">
    <FamilyTreeVisualization families={families} />
  </TabsContent>
</Tabs>
```

### Aba: Árvore Genealógica

**Funcionalidades**:
- ✅ Visualização interativa com React Flow
- ✅ Nós customizados para Responsáveis (rosa-rose) e Alunos (roxo-indigo)
- ✅ Edges coloridos por tipo de relacionamento:
  - 🟣 SIBLING (violet)
  - 🟠 COUSIN (orange)
  - 🟢 UNCLE_NEPHEW (green)
  - 🔵 GODPARENT (blue)
  - ⚪ OTHER (gray)
- ✅ Busca global sincronizada (filtra lista e árvore)
- ✅ Zoom para família selecionada (`fitBounds`)
- ✅ Highlight de família selecionada (opacidade reduzida nos outros)
- ✅ Painel de quick-zoom com miniaturas das famílias
- ✅ Legenda retratável de tipos de relacionamento
- ✅ Breadcrumb de navegação
- ✅ Exportar árvore como PNG ou PDF

**Código de Nós Customizados**:
```typescript
// src/components/admin/family-tree/GuardianNode.tsx
export function GuardianNode({ data }: NodeProps<GuardianNodeData>) {
  return (
    <div className="guardian-node bg-gradient-to-br from-pink-500 to-rose-600 
                    backdrop-blur-xl border border-white/20 rounded-xl p-4 
                    shadow-lg hover:scale-105 transition-transform">
      <Handle type="source" position={Position.Bottom} />
      <Handle type="target" position={Position.Top} />
      
      <div className="flex items-center gap-3">
        <Heart className="w-6 h-6 text-white" />
        <div>
          <h3 className="text-white font-semibold">{data.name}</h3>
          <p className="text-white/80 text-sm">{data.email}</p>
          <Badge variant="secondary">{data.studentCount} alunos</Badge>
        </div>
      </div>
    </div>
  );
}
```

**Routing Inteligente de Relacionamentos**:
```typescript
// src/utils/create-family-edges.ts
export function createFamilyEdges(families: FamilyGroup[]): Edge[] {
  const edges: Edge[] = [];

  for (const family of families) {
    for (const student of family.students) {
      const relationships = student.notes?.familyRelationships || [];

      for (const rel of relationships) {
        edges.push({
          id: `${student.id}-${rel.relatedStudentId}`,
          source: student.id,
          target: rel.relatedStudentId,
          type: 'smoothstep',
          sourceHandle: 'right', // Lateral para student-to-student
          targetHandle: 'left',
          style: getEdgeStyleByType(rel.relationshipType),
        });
      }
    }
  }

  return edges;
}
```

---

## 📄 Export Excel de Relações Familiares

### Funcionalidade

Gera relatório executivo com 6 abas temáticas no estilo Power BI:

1. **Resumo Executivo**: Métricas gerais (total de famílias, média de alunos, etc.)
2. **Famílias Cadastradas**: Lista completa de famílias com detalhes
3. **Distribuição de Parentescos**: Tabela de tipos de relacionamento
4. **Famílias com Múltiplos Alunos**: Famílias com 2+ alunos
5. **Responsáveis Mais Recorrentes**: Top responsáveis com mais alunos
6. **Análise de Vínculos**: Matriz de relacionamentos aluno-a-aluno

**Código**:
```typescript
// src/utils/export-family-relationships.ts
import ExcelJS from 'exceljs';

export async function exportFamilyRelationshipsToExcel(
  metrics: FamilyMetrics,
  schoolName: string
) {
  const workbook = new ExcelJS.Workbook();

  // Aba 1: Resumo Executivo
  const summarySheet = workbook.addWorksheet('Resumo Executivo');
  summarySheet.addRow(['Total de Famílias', metrics.totalFamilies]);
  summarySheet.addRow(['Famílias com 2+ Alunos', metrics.familiesWithMultipleStudents]);
  summarySheet.addRow(['Média de Alunos por Família', metrics.averageStudentsPerFamily]);

  // Aba 2: Famílias Cadastradas
  const familiesSheet = workbook.addWorksheet('Famílias Cadastradas');
  familiesSheet.columns = [
    { header: 'Responsável', key: 'guardian', width: 30 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Telefone', key: 'phone', width: 20 },
    { header: 'Nº de Alunos', key: 'studentCount', width: 15 },
    { header: 'Alunos', key: 'students', width: 50 },
  ];

  for (const family of metrics.familyGroups) {
    familiesSheet.addRow({
      guardian: family.guardian_name,
      email: family.guardian_email,
      phone: family.guardian_phone,
      studentCount: family.student_count,
      students: family.students.map(s => s.name).join(', '),
    });
  }

  // ... outras abas

  // Salvar arquivo
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `relacoes-familiares-${schoolName}-${Date.now()}.xlsx`);
}
```

---

## 🔧 Ferramentas Administrativas

### 1. Corrigir Relacionamentos (Inferência Transitiva)

**Botão**: Ícone 🔧 no header → "Corrigir Relacionamentos"

**Funcionalidade**:
- Executa `useTransitiveInference().runTransitiveInference(schoolId)`
- Propaga relacionamentos transitivos para toda a escola
- Exibe toast de sucesso com número de relacionamentos criados

### 2. Limpar Dados Legados Inválidos

**Botão**: Disponível em dropdown administrativo

**Funcionalidade**:
- Remove todos os `GODPARENT_GODCHILD` do array `familyRelationships` (tipo inválido)
- Corrige dados de migrações antigas

**Código**:
```typescript
// src/utils/fix-family-relationships.ts
export async function cleanInvalidRelationships(schoolId: string) {
  const { data: students } = await supabase
    .from('profiles')
    .select('*')
    .eq('current_school_id', schoolId);

  for (const student of students) {
    const relationships = student.student_notes?.familyRelationships || [];
    const cleanedRelationships = relationships.filter(
      rel => rel.relationshipType !== 'GODPARENT_GODCHILD'
    );

    if (cleanedRelationships.length !== relationships.length) {
      await supabase.from('profiles').update({
        student_notes: {
          ...student.student_notes,
          familyRelationships: cleanedRelationships,
        },
      }).eq('id', student.id);
    }
  }
}
```

### 3. Editar Aluno Inline

**Funcionalidade**:
- Ícone de lápis (✏️) ao lado de cada aluno na sidebar de detalhes
- Abre modal `StudentFormSteps` em modo de edição
- Após salvar, recarrega dados da família automaticamente

**Código**:
```typescript
// src/components/admin/FamilyDetailsSidebar.tsx
const [editingStudent, setEditingStudent] = useState<Student | null>(null);

<div className="flex items-center gap-2">
  <span>{student.name}</span>
  <Button
    variant="ghost"
    size="icon"
    onClick={() => setEditingStudent(student)}
  >
    <Pencil className="w-4 h-4" />
  </Button>
</div>

{editingStudent && (
  <StudentFormSteps
    isOpen={!!editingStudent}
    onClose={() => {
      setEditingStudent(null);
      refetchFamilies(); // Recarregar dados
    }}
    student={editingStudent}
  />
)}
```

---

## 🚨 Problemas Comuns e Soluções

### ❌ Problema: Aluno deletado ainda aparece na árvore

**Causa**: Cache do React Query não foi invalidado.

**Solução**:
```typescript
// src/hooks/useStudents.ts
const deleteStudent = async (studentId: string) => {
  await supabase.from('profiles').delete().eq('id', studentId);

  // Invalidar cache de relações familiares
  queryClient.invalidateQueries({ queryKey: ['family-metrics'] });
  queryClient.invalidateQueries({ queryKey: ['family-groups'] });
};
```

### ❌ Problema: Relacionamentos duplicados após inferência transitiva

**Causa**: Validação de duplicatas ausente.

**Solução**:
```typescript
// Antes de adicionar, verificar se já existe
const alreadyExists = existingRelationships.some(
  r => r.relatedStudentId === newRelationship.relatedStudentId
);

if (!alreadyExists) {
  existingRelationships.push(newRelationship);
}
```

### ❌ Problema: GODPARENT_GODCHILD aparece entre dois alunos

**Causa**: Tipo de relacionamento inválido.

**Solução**: Executar limpeza de dados legados (ferramenta administrativa).

---

## 📚 Arquivos Principais

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/admin/FamilyRelationsPage.tsx` | Página principal |
| `src/hooks/useFamilyMetrics.ts` | Hook para métricas de famílias |
| `src/hooks/useTransitiveInference.ts` | Inferência transitiva |
| `src/components/admin/family-tree/FamilyTreeVisualization.tsx` | Árvore genealógica |
| `src/components/admin/family-tree/GuardianNode.tsx` | Nó de responsável |
| `src/components/admin/family-tree/StudentNode.tsx` | Nó de aluno |
| `src/utils/propagate-relationships.ts` | Lógica de propagação |
| `src/utils/transitive-relationship-rules.ts` | Matriz de regras |
| `src/utils/export-family-relationships.ts` | Export Excel |
| `src/utils/student-notes-helpers.ts` | Schema de `student_notes` |

---

## 🔗 Documentação Relacionada

- [Arquitetura Multi-Tenancy](./multi-tenancy-architecture.md)
- [Sistema de Detecção de Duplicatas](./duplicate-detection-system.md)
- [Dashboard de Impacto dos Koins](./koins-impact-dashboard.md)

---

**⚠️ LEMBRE-SE**: Relacionamentos familiares são sensíveis. Sempre garantir que `GODPARENT_GODCHILD` seja Guardian→Student, nunca Student→Student. Validar dados legados antes de produção.
