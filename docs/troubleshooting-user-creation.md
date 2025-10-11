# Troubleshooting: Criação de Usuários e Problemas de Login

## Problema Resolvido

Usuários criados pela secretaria não conseguiam fazer login imediatamente após a criação.

## Causa Raiz

O problema tinha múltiplas causas relacionadas a **race conditions** e timing:

1. **Inserção Duplicada de Role**: A edge function `create-demo-user` tentava inserir a role manualmente, mas o trigger `handle_new_user_role()` já fazia isso automaticamente, causando erros de "duplicate key"

2. **Falta de Retry no AuthContext**: O `getUserProfile()` falhava imediatamente se a role não fosse encontrada, sem aguardar ou tentar novamente

3. **Política RLS Faltando**: Não havia política explícita permitindo INSERT em `user_roles` via trigger SECURITY DEFINER

4. **Falta de Feedback**: A interface não informava ao usuário sobre o tempo necessário para completar a criação

5. **Validação Incompleta**: O login não validava se o perfil estava completo antes de considerar bem-sucedido

## Soluções Implementadas

### 1. Removida Inserção Duplicada (Edge Function)
**Arquivo**: `supabase/functions/create-demo-user/index.ts`

```typescript
// ❌ ANTES: Inserção manual duplicada
const { error: roleInsertError } = await supabaseAdmin
  .from('user_roles')
  .insert({ user_id: data.user.id, role: role })

// ✅ DEPOIS: Confia no trigger
console.log('User role will be created automatically by trigger')
```

**Benefício**: Elimina erro de duplicate key e reduz latência

### 2. Adicionada Política RLS para Trigger (SQL)
**Arquivo**: Nova migração SQL

```sql
CREATE POLICY "Sistema pode criar roles via trigger"
ON public.user_roles
FOR INSERT
WITH CHECK (true);
```

**Benefício**: Garante que o trigger sempre consiga inserir roles

### 3. Implementado Retry Automático (AuthContext)
**Arquivo**: `src/contexts/AuthContext.tsx`

```typescript
const getUserProfile = async (userId: string, retryCount = 0): Promise<User | null> => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 500;
  
  // ... busca perfil e role ...
  
  if (roleError || !userRole) {
    if (retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return getUserProfile(userId, retryCount + 1);
    }
    return null;
  }
  
  // ... validação completa do perfil ...
}
```

**Benefício**: Torna o login robusto contra problemas de timing

### 4. Melhorado Feedback ao Usuário (Hooks)
**Arquivos**: `src/hooks/useStudents.ts` e `src/hooks/useTeachers.ts`

```typescript
// Toast informativo
toast.success(
  'Usuário criado com sucesso! Aguarde 5 segundos antes de fazer login.',
  { duration: 5000 }
);

// Delay automático
await new Promise(resolve => setTimeout(resolve, 5000));
```

**Benefício**: Usuário sabe exatamente o que esperar

### 5. Validação de Perfil Completo
**Arquivo**: `src/contexts/AuthContext.tsx`

```typescript
// Validar perfil completo antes de considerar login bem-sucedido
if (!profile.name || !profile.email || !userRole.role) {
  console.error('[getUserProfile] Perfil incompleto');
  return null;
}
```

**Benefício**: Evita estados inconsistentes

## Fluxo de Criação de Usuário (Após Correções)

```
1. Edge Function create-demo-user é chamada
   ↓
2. Usuário é criado em auth.users
   ↓
3. Trigger handle_new_user dispara → Cria perfil em profiles
   ↓
4. Trigger handle_new_user_role dispara → Cria role em user_roles
   ↓
5. Toast informa "Aguarde 5 segundos"
   ↓
6. Delay automático de 5 segundos
   ↓
7. Lista de usuários é atualizada
   ↓
8. Usuário pode fazer login com sucesso
```

## Como Diagnosticar Problemas Similares

### 1. Verificar Auth Logs
```bash
# No dashboard do Supabase: Authentication > Logs
# Procurar por:
- "Database error creating new user"
- "duplicate key value violates unique constraint"
```

### 2. Verificar Edge Function Logs
```bash
# Buscar por:
- "Error creating user role"
- "User role will be created automatically by trigger"
```

### 3. Verificar Console Logs do AuthContext
```javascript
// Procurar por:
[getUserProfile] Tentativa X/4 para usuário...
[getUserProfile] Role não encontrada (tentativa X)
[getUserProfile] ✅ Perfil completo encontrado
```

### 4. Verificar Tabelas Diretamente
```sql
-- Verificar se perfil foi criado
SELECT * FROM profiles WHERE email = 'novo_usuario@email.com';

-- Verificar se role foi criada
SELECT ur.*, p.name, p.email 
FROM user_roles ur 
JOIN profiles p ON ur.user_id = p.id 
WHERE p.email = 'novo_usuario@email.com';
```

## Melhores Práticas

### ✅ DO (Fazer)
- Confiar nos triggers SECURITY DEFINER para criar roles
- Implementar retry automático em operações sensíveis a timing
- Adicionar logging detalhado com prefixos identificáveis
- Informar usuários sobre delays necessários
- Validar completude dos dados antes de considerar operação bem-sucedida

### ❌ DON'T (Não Fazer)
- Não inserir roles manualmente quando há trigger fazendo isso
- Não falhar imediatamente sem tentar novamente em casos de timing
- Não assumir que operações assíncronas são instantâneas
- Não deixar usuários sem feedback sobre o status da operação
- Não permitir login com perfil incompleto

## Troubleshooting Rápido

| Sintoma | Causa Provável | Solução |
|---------|---------------|---------|
| "Database error creating new user" | Trigger falhando ao inserir role | Verificar política RLS em user_roles |
| "duplicate key value violates unique constraint" | Inserção duplicada de role | Remover inserção manual na edge function |
| Usuário não consegue fazer login logo após criação | Race condition, role não criada ainda | Aguardar 5 segundos antes de tentar login |
| getUserProfile retorna null | Role não encontrada | Implementar retry automático |
| Login bem-sucedido mas app quebra | Perfil incompleto | Validar todos os campos necessários |

## Contato para Suporte

Se problemas similares persistirem após estas correções:
1. Verificar logs conforme seção "Como Diagnosticar"
2. Verificar se todas as 5 correções foram aplicadas
3. Revisar políticas RLS nas tabelas `profiles` e `user_roles`
4. Verificar se os triggers estão ativos e funcionando

## Changelog

- **2025-01-11**: Implementadas todas as 5 correções
  - Removida inserção duplicada de role
  - Adicionada política RLS para trigger
  - Implementado retry automático no getUserProfile
  - Adicionado feedback e delay de 5 segundos
  - Implementada validação de perfil completo
