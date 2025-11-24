# Arquitetura Multi-Tenancy (Multi-Escola)

**Última atualização**: 2025-01-24  
**Status**: ✅ Implementado e Validado  
**Prioridade**: 🔴 CRÍTICA

---

## 📋 Visão Geral

O sistema implementa **isolamento total multi-tenancy baseado em escolas**. Cada escola opera como um **ecossistema completamente independente** com seus próprios:

- 👥 Usuários (administradores, secretárias, professores, alunos)
- 📚 Turmas e disciplinas
- 📝 Posts, atividades e eventos
- 🎯 Desafios e sistema de Koins
- 👨‍👩‍👧‍👦 Relações familiares
- 📊 Analytics e insights preditivos

**Regra de Ouro**: Nenhum vazamento de dados entre escolas é aceitável. Todo dado deve ser filtrado por `school_id`.

---

## 🏗️ Arquitetura da Base de Dados

### Tabela Central: `schools`

```sql
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Fonte de Verdade: `school_memberships`

A tabela `school_memberships` é a **única fonte de verdade** para determinar quais usuários pertencem a qual escola.

```sql
CREATE TABLE school_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'administrador', 'secretaria', 'professor', 'aluno'
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, school_id, role)
);
```

**Campos importantes**:
- `user_id`: ID do usuário (referência para `auth.users`)
- `school_id`: ID da escola
- `role`: Role do usuário nessa escola específica
- `is_primary`: Se esta é a escola primária do usuário (para login inicial)

### Tabela: `profiles`

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar TEXT,
  current_school_id UUID REFERENCES schools(id),
  -- ... outros campos
);
```

**Campo crítico**: `current_school_id` indica qual escola o usuário está visualizando no momento.

---

## ⚙️ Funcionamento do Multi-Tenancy

### 1. SchoolContext (Frontend)

Todos os componentes React acessam a escola ativa através do `SchoolContext`:

```typescript
// src/contexts/SchoolContext.tsx
import { useSchool } from '@/contexts/SchoolContext';

function MyComponent() {
  const { currentSchool } = useSchool();
  
  // currentSchool.id é usado para filtrar dados
  const { data: students } = useStudents(); // Já filtra por currentSchool.id
}
```

**Componentes principais**:
- `SchoolProvider`: Provedor de contexto
- `SchoolSwitcher`: Componente para trocar de escola (apenas admin)
- `useSchool()`: Hook para acessar escola atual

### 2. Hooks Filtrados por Escola

Todos os hooks de dados filtram automaticamente por `currentSchool.id`:

| Hook | Tabela | Filtro |
|------|--------|--------|
| `useStudents` | `profiles` + `school_memberships` | `school_id = currentSchool.id` |
| `useTeachers` | `profiles` + `school_memberships` | `school_id = currentSchool.id` |
| `useSecretarias` | `profiles` + `school_memberships` | `school_id = currentSchool.id` |
| `usePosts` | `posts` | `school_id = currentSchool.id` |
| `useClasses` | `classes` | `school_id = currentSchool.id` |
| `useFamilyMetrics` | RPC `get_family_metrics` | `school_id_param = currentSchool.id` |

**Exemplo de implementação**:

```typescript
// src/hooks/useStudents.ts
export function useStudents() {
  const { currentSchool } = useSchool();

  return useQuery({
    queryKey: ['students', currentSchool?.id],
    queryFn: async () => {
      if (!currentSchool) throw new Error('Escola não selecionada');

      // 1. Buscar IDs de alunos via school_memberships
      const { data: memberships } = await supabase
        .from('school_memberships')
        .select('user_id')
        .eq('school_id', currentSchool.id)
        .eq('role', 'aluno');

      // 2. Buscar perfis completos
      const studentIds = memberships?.map(m => m.user_id) || [];
      const { data: students } = await supabase
        .from('profiles')
        .select('*')
        .in('id', studentIds);

      return students || [];
    },
    enabled: !!currentSchool,
  });
}
```

### 3. Recarga Automática ao Trocar de Escola

Quando o administrador troca de escola usando o `SchoolSwitcher`, todos os dados recarregam automaticamente:

```typescript
// src/hooks/useTeachers.ts
export function useTeachers() {
  const { currentSchool } = useSchool();

  // currentSchool.id como dependência força refetch
  return useQuery({
    queryKey: ['teachers', currentSchool?.id],
    queryFn: async () => { /* ... */ },
    enabled: !!currentSchool,
  });
}
```

**Mecanismo**:
- `currentSchool.id` está na `queryKey`
- React Query detecta mudança e refaz a query automaticamente
- Componentes são atualizados com dados da nova escola

---

## 🔒 Segurança: Row Level Security (RLS)

### Políticas RLS por Escola

Todas as tabelas com `school_id` devem ter RLS policies que garantam isolamento:

**Exemplo: Tabela `posts`**

```sql
-- Política de SELECT
CREATE POLICY "Users can view posts from their school"
ON posts FOR SELECT
USING (
  school_id IN (
    SELECT school_id 
    FROM school_memberships 
    WHERE user_id = auth.uid()
  )
);

-- Política de INSERT
CREATE POLICY "Users can create posts in their school"
ON posts FOR INSERT
WITH CHECK (
  school_id IN (
    SELECT school_id 
    FROM school_memberships 
    WHERE user_id = auth.uid()
  )
);
```

**Exemplo: Tabela `school_memberships`**

```sql
-- Administradores podem ver membros de suas escolas
CREATE POLICY "Admins can view school memberships"
ON school_memberships FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM school_memberships sm
    WHERE sm.user_id = auth.uid()
    AND sm.school_id = school_memberships.school_id
    AND sm.role = 'administrador'
  )
);
```

### RLS em Funções RPC

Funções PostgreSQL também devem filtrar por escola:

```sql
CREATE OR REPLACE FUNCTION get_family_metrics(school_id_param UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  effective_school_id UUID;
BEGIN
  -- Se school_id_param não fornecido, usar current_school_id do usuário
  IF school_id_param IS NULL THEN
    SELECT current_school_id INTO effective_school_id
    FROM profiles
    WHERE id = auth.uid();
  ELSE
    effective_school_id := school_id_param;
  END IF;

  -- Validar que usuário tem acesso a esta escola
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
      'totalFamilies', COUNT(DISTINCT guardian_id),
      -- ... outros campos
    )
    FROM profiles
    WHERE current_school_id = effective_school_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🛠️ Implementação no Código

### Edge Functions

Edge Functions devem sempre obter o `school_id` do perfil do usuário:

```typescript
// supabase/functions/create-demo-user/index.ts
const { data: profile } = await supabase
  .from('profiles')
  .select('current_school_id')
  .eq('id', actorUserId)
  .single();

const schoolId = profile?.current_school_id;

// Criar membership vinculando usuário à escola
await supabase.from('school_memberships').insert({
  user_id: newUserId,
  school_id: schoolId,
  role: requestedRole,
});
```

### Cadastro de Novos Usuários

Ao criar um usuário, **sempre** criar o registro em `school_memberships`:

```typescript
// 1. Criar usuário no Supabase Auth
const { data: authData } = await supabase.auth.admin.createUser({
  email: userData.email,
  password: userData.password,
  email_confirm: true,
});

// 2. Criar perfil
await supabase.from('profiles').insert({
  id: authData.user.id,
  name: userData.name,
  email: userData.email,
  current_school_id: currentSchool.id, // ⚠️ CRÍTICO
});

// 3. Criar membership
await supabase.from('school_memberships').insert({
  user_id: authData.user.id,
  school_id: currentSchool.id, // ⚠️ CRÍTICO
  role: userData.role,
});
```

### Dashboard do Administrador

O `AdminDashboard` conta usuários via `school_memberships`:

```typescript
// src/pages/admin/AdminDashboard.tsx
const loadDashboardMetrics = useCallback(async () => {
  if (!currentSchool) return;

  // Contar alunos
  const { data: studentMemberships } = await supabase
    .from('school_memberships')
    .select('user_id')
    .eq('school_id', currentSchool.id)
    .eq('role', 'aluno');

  const studentCount = studentMemberships?.length || 0;

  // Contar professores
  const { data: teacherMemberships } = await supabase
    .from('school_memberships')
    .select('user_id')
    .eq('school_id', currentSchool.id)
    .eq('role', 'professor');

  const teacherCount = teacherMemberships?.length || 0;

  setMetrics({ studentCount, teacherCount, /* ... */ });
}, [currentSchool]);
```

---

## 🚨 Problemas Comuns e Soluções

### ❌ Problema: Usuário não aparece na lista após criação

**Causa**: `current_school_id` não foi preenchido no perfil ou membership não foi criado.

**Solução**:
```sql
-- Corrigir perfis sem current_school_id
UPDATE profiles
SET current_school_id = sm.school_id
FROM school_memberships sm
WHERE profiles.id = sm.user_id
AND profiles.current_school_id IS NULL;
```

### ❌ Problema: Dados de outra escola aparecem

**Causa**: RLS policy ausente ou filtro por escola não implementado.

**Solução**:
1. Verificar se a tabela tem RLS habilitado: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
2. Criar policy de SELECT filtrando por `school_id`
3. No frontend, verificar se o hook filtra por `currentSchool.id`

### ❌ Problema: AdminDashboard não atualiza ao trocar de escola

**Causa**: Hook não tem `currentSchool.id` como dependência.

**Solução**:
```typescript
const loadMetrics = useCallback(async () => {
  // lógica de fetch
}, [currentSchool]); // ⚠️ Adicionar currentSchool como dependência

useEffect(() => {
  loadMetrics();
}, [loadMetrics]); // ⚠️ Refaz quando loadMetrics muda
```

### ❌ Problema: Query retorna dados vazios após trocar escola

**Causa**: React Query retorna cache da escola anterior.

**Solução**: Incluir `currentSchool.id` na `queryKey`:
```typescript
useQuery({
  queryKey: ['students', currentSchool?.id], // ⚠️ CRÍTICO
  queryFn: async () => { /* ... */ },
});
```

---

## ✅ Checklist de Validação Multi-Tenancy

Ao implementar uma nova funcionalidade, verifique:

- [ ] Tabela possui coluna `school_id` (se aplicável)
- [ ] RLS policies filtram por `school_id`
- [ ] Hook React filtra por `currentSchool.id`
- [ ] `currentSchool.id` está na `queryKey` do React Query
- [ ] Edge functions obtêm `school_id` do perfil do usuário
- [ ] Ao criar registros, `school_id` é preenchido corretamente
- [ ] Dashboard atualiza automaticamente ao trocar escola
- [ ] Testes manuais com múltiplas escolas realizados

---

## 📚 Arquivos Principais

| Arquivo | Descrição |
|---------|-----------|
| `src/contexts/SchoolContext.tsx` | Contexto de escola ativa |
| `src/components/admin/SchoolSwitcher.tsx` | Componente para trocar escola |
| `src/hooks/useStudents.ts` | Hook filtrado por escola |
| `src/hooks/useTeachers.ts` | Hook filtrado por escola |
| `src/hooks/useSecretarias.ts` | Hook filtrado por escola |
| `src/hooks/usePosts.ts` | Hook filtrado por escola |
| `src/hooks/useFamilyMetrics.ts` | Hook filtrado por escola |
| `src/pages/admin/AdminDashboard.tsx` | Dashboard filtrado por escola |
| `supabase/functions/create-demo-user/index.ts` | Edge function com multi-tenancy |

---

## 🔗 Documentação Relacionada

- [Sistema de Detecção de Duplicatas](./duplicate-detection-system.md)
- [Sistema de Relações Familiares](./family-relationships-system.md)
- [Insights Preditivos com IA](./ai-predictive-insights.md)
- [Dashboard de Impacto dos Koins](./koins-impact-dashboard.md)

---

**⚠️ LEMBRE-SE**: Multi-tenancy é a base de todo o sistema. Qualquer vazamento de dados entre escolas é uma vulnerabilidade crítica de segurança. Sempre valide o isolamento antes de lançar novas funcionalidades.
