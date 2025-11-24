# Sistema de Detecção Inteligente de Duplicatas

**Última atualização**: 2025-01-24  
**Status**: ✅ Implementado e Validado  
**Prioridade**: 🔴 CRÍTICA (Segurança)

---

## 📋 Visão Geral

O sistema implementa **detecção inteligente de duplicatas** para evitar registros fraudulentos ou incorretos durante o cadastro de usuários (alunos, professores, secretárias).

### Objetivos

✅ Prevenir cadastros duplicados (CPF, email, matrícula)  
✅ Detectar possíveis homônimos e alertar o administrador  
✅ Permitir exceções justificadas (irmãos, homônimos legítimos)  
✅ Validar dados em tempo real (inline) e em cada step do formulário  
✅ Garantir integridade de dados no frontend e backend  

---

## 🎯 Tipos de Validação

### 1. Hard-Constraints (Validações Bloqueantes)

**Bloqueiam o cadastro imediatamente**. Não permitem exceções.

| Campo | Escopo | Mensagem de Erro |
|-------|--------|------------------|
| **CPF/Documento** | Global (todas as escolas) | "Este CPF já está cadastrado no sistema" |
| **Email** | Global (todas as escolas) | "Este email já está cadastrado no sistema. Use outro email." |
| **Número de Matrícula** | Por escola (multi-tenant) | "Este número de matrícula já está em uso nesta escola" |

**Constraint de Banco de Dados**:
```sql
ALTER TABLE profiles
ADD CONSTRAINT unique_enrollment_per_school 
UNIQUE NULLS NOT DISTINCT (enrollment_number, current_school_id);
```

### 2. Soft-Warnings (Alertas Inteligentes)

**Alertam o administrador** mas permitem confirmação para prosseguir.

| Campo | Severidade | Condição | Mensagem |
|-------|------------|----------|----------|
| **Nome Idêntico** | Low (info) | Nome exatamente igual | "Usuário similar encontrado" |
| **Nome + Data de Nascimento** | High (critical) | Nome + DOB iguais | "Possível duplicata detectada" |
| **Telefone Principal** | Medium (critical) | Telefone idêntico | "Este telefone já está cadastrado" |
| **Endereço Completo** | Medium (info) | Endereço idêntico | "Endereço similar detectado" |

---

## 🏗️ Arquitetura do Sistema

### 1. Hook Principal: `useDuplicateCheck`

**Localização**: `src/hooks/useDuplicateCheck.ts`

**Funcionalidade**:
- Valida CPF, email, matrícula, nome, telefone e data de nascimento
- Retorna listas de `blockingIssues` (bloqueantes) e `warnings` (alertas)
- Executa queries no Supabase para buscar registros existentes
- Normaliza dados (ex: CPF sem formatação) para comparação

**Uso**:
```typescript
import { useDuplicateCheck } from '@/hooks/useDuplicateCheck';

function StudentForm() {
  const { validateDuplicates, isChecking } = useDuplicateCheck();

  const handleCheckDuplicates = async () => {
    const result = await validateDuplicates({
      name: formData.name,
      email: formData.email,
      document: formData.cpf,
      enrollment: formData.enrollment,
      phone: formData.phone,
      dob: formData.dob,
      excludeUserId: editMode ? currentUser.id : undefined,
    });

    if (result.blockingIssues.length > 0) {
      setShowDuplicateModal(true);
      return false; // Bloquear cadastro
    }

    if (result.warnings.length > 0) {
      setShowDuplicateModal(true);
      // Permitir confirmação
    }

    return true; // OK para prosseguir
  };
}
```

**Retorno**:
```typescript
interface DuplicateCheckResult {
  blockingIssues: DuplicateUser[]; // Bloqueantes (CPF, email, matrícula)
  warnings: DuplicateUser[];        // Alertas (nome, telefone, etc.)
}

interface DuplicateUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  enrollment?: string;
  document?: string;
  role?: string;
  similarity: number; // 0-100
  matchedFields: string[]; // ['name', 'dob']
}
```

### 2. Componente de Alerta: `DuplicateWarning`

**Localização**: `src/components/DuplicateWarning.tsx`

**Funcionalidade**:
- Modal moderno e profissional para exibir duplicatas
- 3 tipos de alertas: `blocking`, `critical`, `info`
- Badge visual indicando campo duplicado (Email, Nome, Telefone, Documento)
- Botões de ação intuitivos: "Corrigir", "Cancelar", "Continuar Mesmo Assim"

**Uso**:
```typescript
<DuplicateWarning
  isOpen={showDuplicateModal}
  onClose={() => setShowDuplicateModal(false)}
  type="blocking" // 'blocking' | 'critical' | 'info'
  title="Email Duplicado"
  message="Este email já está cadastrado no sistema. Use outro email."
  duplicateUsers={[
    {
      id: '123',
      name: 'João Silva',
      email: 'joao@escola.com',
      role: 'aluno',
      matchedFields: ['email'],
    }
  ]}
  onConfirm={() => handleContinueAnyway()}
  fieldType="email" // 'email' | 'name' | 'phone' | 'document' | 'enrollment'
/>
```

**Design Visual**:
- Header com gradiente sutil e ícone grande
- Badge proeminente do campo duplicado (ex: "EMAIL" em vermelho)
- Cards de usuários existentes com avatar/iniciais
- Destaque visual no campo duplicado (ex: email em negrito)
- Micro-interações nos botões (hover effects)

---

## ⚙️ Validação em Tempo Real (Inline)

### Validação `onBlur` (Ao Sair do Campo)

Campos sensíveis validam duplicatas ao perder foco:

```typescript
// src/components/admin/StudentFormSteps.tsx
<Input
  id="email"
  type="email"
  value={formData.email}
  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
  onBlur={async (e) => {
    const email = e.target.value.trim();
    if (!email) return;

    const result = await validateDuplicates({ email });
    
    if (result.blockingIssues.length > 0) {
      // Email duplicado - bloquear
      setDuplicateCheck(result);
      setShowDuplicateModal(true);
    }
  }}
/>
```

**Campos com validação inline**:
- ✅ Email (blocking)
- ✅ CPF/Documento (blocking)
- ✅ Número de Matrícula (blocking)
- ✅ Telefone do responsável (critical warning)

**Visual Feedback**: Ícones de ✅ (disponível) ou ❌ (duplicado) aparecem ao lado do campo após validação.

---

## 🔄 Validação Proativa por Step

Formulários multi-step validam duplicatas **antes de avançar** para o próximo step, evitando que o usuário preencha tudo para descobrir uma duplicata no final.

### Implementação em `StudentFormSteps.tsx`

```typescript
const validateDuplicatesForStep = async (step: number) => {
  if (step === 0) {
    // Step 1: Validar CPF
    const result = await validateDuplicates({ 
      document: formData.notes?.document 
    });
    if (result.blockingIssues.length > 0) {
      setDuplicateCheck(result);
      setShowDuplicateModal(true);
      return false;
    }
  }

  if (step === 1) {
    // Step 2: Validar Email
    const result = await validateDuplicates({ 
      email: formData.email 
    });
    if (result.blockingIssues.length > 0) {
      setDuplicateCheck(result);
      setShowDuplicateModal(true);
      return false;
    }
  }

  if (step === 2) {
    // Step 3: Validar Matrícula
    const result = await validateDuplicates({ 
      enrollment: formData.enrollment 
    });
    if (result.blockingIssues.length > 0) {
      setDuplicateCheck(result);
      setShowDuplicateModal(true);
      return false;
    }
  }

  return true; // OK para avançar
};

const nextStep = async () => {
  // 1. Validar campos obrigatórios
  if (!validateStep(currentStep)) return;

  // 2. Validar duplicatas
  setIsChecking(true);
  const isValid = await validateDuplicatesForStep(currentStep);
  setIsChecking(false);

  if (!isValid) return; // Duplicata encontrada, bloquear avanço

  // 3. Avançar step
  setCurrentStep(prev => prev + 1);
};
```

**Botão "Próximo" com Loading**:
```typescript
<Button onClick={nextStep} disabled={isChecking}>
  {isChecking ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Verificando...
    </>
  ) : (
    'Próximo'
  )}
</Button>
```

---

## 🔒 Validação Backend (Edge Function)

### Edge Function: `create-demo-user`

**Localização**: `supabase/functions/create-demo-user/index.ts`

**Validação Server-Side**:
```typescript
// 1. Validar CPF duplicado
const { data: existingCPF } = await supabase
  .from('profiles')
  .select('id, name')
  .eq('student_notes->document', requestData.document)
  .single();

if (existingCPF) {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: 'Este CPF já está cadastrado no sistema.' 
    }),
    { status: 409, headers: corsHeaders }
  );
}

// 2. Validar Email duplicado (Supabase Auth já valida, mas...)
const { data: existingEmail } = await supabase.auth.admin.listUsers();
const emailExists = existingEmail.users.some(u => u.email === requestData.email);

if (emailExists) {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: 'Este email já está cadastrado no sistema. Use outro email.' 
    }),
    { status: 409, headers: corsHeaders }
  );
}

// 3. Validar Matrícula duplicada (por escola)
const { data: existingEnrollment } = await supabase
  .from('profiles')
  .select('id, name')
  .eq('enrollment_number', requestData.enrollment)
  .eq('current_school_id', schoolId)
  .single();

if (existingEnrollment) {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: 'Este número de matrícula já está em uso nesta escola.' 
    }),
    { status: 409, headers: corsHeaders }
  );
}
```

**Tratamento de Erro no Frontend**:
```typescript
// src/hooks/useStudents.ts
const createStudent = async (studentData) => {
  try {
    const response = await fetch(
      `https://yanspolqarficibgovia.supabase.co/functions/v1/create-demo-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(studentData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao criar aluno');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao criar aluno:', error);
    throw error;
  }
};
```

---

## 🗄️ Índices de Performance

Para otimizar as queries de detecção de duplicatas, foram criados índices:

```sql
-- Índice GIN para busca de CPF em JSONB
CREATE INDEX idx_profiles_document_gin 
ON profiles USING gin ((student_notes->'document'));

-- Índices compostos para busca de nome por escola
CREATE INDEX idx_profiles_name_school 
ON profiles (name, current_school_id);

CREATE INDEX idx_profiles_enrollment_school 
ON profiles (enrollment_number, current_school_id);

CREATE INDEX idx_profiles_phone_school 
ON profiles (phone, current_school_id);

CREATE INDEX idx_profiles_dob_school 
ON profiles (dob, current_school_id);
```

---

## 🧪 Testes Manuais

### Cenário 1: CPF Duplicado (Blocking)

1. Cadastrar aluno com CPF `123.456.789-00`
2. Tentar cadastrar outro aluno com mesmo CPF
3. **Resultado esperado**: Modal de erro "Este CPF já está cadastrado" com botão "Voltar e Corrigir"

### Cenário 2: Email Duplicado (Blocking)

1. Cadastrar secretária com email `ana@escola.com`
2. Tentar cadastrar outra secretária com mesmo email
3. **Resultado esperado**: Modal de erro "Este email já está cadastrado. Use outro email." com botão "Voltar e Corrigir"

### Cenário 3: Nome + DOB Idênticos (Critical Warning)

1. Cadastrar aluno "João Silva" nascido em 01/01/2010
2. Cadastrar outro aluno "João Silva" nascido em 01/01/2010
3. **Resultado esperado**: Modal de alerta crítico com botões "Cancelar" e "Continuar Mesmo Assim"

### Cenário 4: Telefone Duplicado (Critical Warning)

1. Cadastrar aluno com telefone do responsável `(11) 98765-4321`
2. Cadastrar outro aluno com mesmo telefone do responsável
3. **Resultado esperado**: Modal de alerta crítico sugerindo que podem ser irmãos

### Cenário 5: Homônimos Legítimos (Info Warning)

1. Cadastrar aluno "Maria Santos"
2. Cadastrar outra aluna "Maria Santos" (DOB diferente)
3. **Resultado esperado**: Modal informativo "Usuário similar encontrado" com botões "Voltar" e "Prosseguir"

---

## 🚨 Problemas Comuns e Soluções

### ❌ Problema: CPF duplicado não está sendo detectado

**Causa**: Normalização de CPF incorreta ou CPF armazenado com formatação.

**Solução**:
```typescript
// Normalizar CPF antes de comparar
const normalizeCPF = (cpf: string) => cpf.replace(/\D/g, '');

// No useDuplicateCheck.ts
const normalizedDocument = data.document ? normalizeCPF(data.document) : null;

// Na query
const { data: existingDocs } = await supabase
  .from('profiles')
  .select('*')
  .ilike('student_notes->document', `%${normalizedDocument}%`);

// Comparar normalizado
const matches = existingDocs?.filter(profile => {
  const profileDoc = profile.student_notes?.document;
  return normalizeCPF(profileDoc || '') === normalizedDocument;
});
```

### ❌ Problema: Email duplicado não exibe modal, apenas toast genérico

**Causa**: Erro do Edge Function não está sendo parseado corretamente.

**Solução**: Usar `fetch` manual em vez de `supabase.functions.invoke`:
```typescript
const response = await fetch(edgeFunctionURL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

if (!response.ok) {
  const errorData = await response.json(); // Parse do JSON de erro
  if (errorData.error?.includes('email já está cadastrado')) {
    setDuplicateCheck({ blockingIssues: [/* ... */] });
    setShowDuplicateModal(true);
  }
}
```

### ❌ Problema: Modal de duplicatas não fecha após correção

**Causa**: Estado `showDuplicateModal` não está sendo resetado.

**Solução**:
```typescript
const handleCloseModal = () => {
  setShowDuplicateModal(false);
  setDuplicateCheck({ blockingIssues: [], warnings: [] }); // Limpar estado
};
```

---

## 📚 Arquivos Principais

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useDuplicateCheck.ts` | Hook principal de validação |
| `src/components/DuplicateWarning.tsx` | Modal de alertas de duplicatas |
| `src/components/admin/StudentFormSteps.tsx` | Formulário de alunos com validação |
| `src/components/admin/TeacherFormModal.tsx` | Formulário de professores com validação |
| `src/components/admin/SecretariaFormModal.tsx` | Formulário de secretárias com validação |
| `supabase/functions/create-demo-user/index.ts` | Edge function com validação backend |

---

## 🔗 Documentação Relacionada

- [Arquitetura Multi-Tenancy](./multi-tenancy-architecture.md)
- [Gerenciamento de Secretarias](./admin-manage-secretaria.md)
- [Troubleshooting de Criação de Usuários](./troubleshooting-user-creation.md)

---

**⚠️ LEMBRE-SE**: Validação de duplicatas é crítica para a integridade dos dados. Sempre valide no frontend (UX) e no backend (segurança). Nunca confie apenas na validação do cliente.
