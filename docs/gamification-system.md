# Sistema de Gamificação (Koins e Desafios)

**Última atualização**: 2025-01-24  
**Status**: ✅ Implementado e Validado  
**Prioridade**: 🟡 IMPORTANTE

---

## 📋 Visão Geral

O **Sistema de Gamificação** utiliza Koins (moeda virtual) e Desafios para aumentar o engajamento e motivação dos alunos na plataforma educacional.

### Objetivos

✅ Recompensar alunos por ações positivas (ler posts, entregar atividades, participar de eventos)  
✅ Criar desafios diários, semanais e conquistas (achievements)  
✅ Permitir resgate de recompensas físicas com Koins  
✅ Gamificar o aprendizado de forma ética e educacional  
✅ Visualizar progresso em tempo real (Nexus Hub)  

**Público-Alvo**: Exclusivamente alunos (role `aluno`). Professores, secretárias e administradores não interagem com o sistema de gamificação.

---

## 🏗️ Arquitetura de Dados

### 1. Tabela: `profiles.koins`

Cada perfil de aluno possui um campo `koins` (INTEGER) que armazena o saldo atual.

```sql
ALTER TABLE profiles ADD COLUMN koins INTEGER DEFAULT 0;
```

**Importante**: Koins são isolados por escola via multi-tenancy. Alunos de escolas diferentes não compartilham Koins.

### 2. Tabela: `koin_transactions`

Registra todas as transações de Koins (ganhos, gastos, reembolsos).

```sql
CREATE TABLE koin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('EARN', 'SPEND', 'BONUS', 'REDEMPTION', 'REFUND')),
  amount INTEGER NOT NULL,
  description TEXT,
  related_entity_id UUID, -- ID de redemption_request se aplicável
  processed_by UUID REFERENCES profiles(id),
  balance_before INTEGER,
  balance_after INTEGER,
  school_id UUID REFERENCES schools(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Tipos de Transação**:
- `EARN`: Koins ganhos por ações (ler post, entregar atividade)
- `BONUS`: Koins ganhos por desafios ou eventos
- `SPEND`: Koins gastos em resgates (não usado diretamente)
- `REDEMPTION`: Koins descontados ao solicitar resgate
- `REFUND`: Koins devolvidos ao rejeitar resgate

### 3. Tabela: `challenges`

Define desafios disponíveis no sistema.

```sql
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('DAILY', 'WEEKLY', 'ACHIEVEMENT')),
  action_target TEXT NOT NULL, -- 'READ_POST', 'SUBMIT_ACTIVITY', 'INVITE_FRIEND', etc.
  action_count INTEGER NOT NULL DEFAULT 1,
  koin_reward INTEGER NOT NULL,
  icon_name TEXT,
  is_active BOOLEAN DEFAULT true,
  school_id UUID REFERENCES schools(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Tipos de Desafio**:
- `DAILY`: Reinicia diariamente (expira à meia-noite)
- `WEEKLY`: Reinicia semanalmente (expira na segunda-feira)
- `ACHIEVEMENT`: Conquista única (nunca expira)

**Action Targets Disponíveis**:
- `READ_POST`: Ler posts
- `SUBMIT_ACTIVITY`: Entregar atividades
- `INVITE_FRIEND`: Convidar amigos para eventos
- `ATTEND_EVENT`: Participar de eventos
- `COMPLETE_PROFILE`: Completar perfil 100%

### 4. Tabela: `student_challenges`

Rastreia o progresso individual de cada aluno em cada desafio.

```sql
CREATE TABLE student_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'EXPIRED')),
  current_progress INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, challenge_id)
);
```

### 5. Tabela: `reward_items`

Itens físicos que alunos podem resgatar com Koins.

```sql
CREATE TABLE reward_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_koins INTEGER NOT NULL,
  stock INTEGER DEFAULT 0,
  category TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  school_id UUID REFERENCES schools(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 6. Tabela: `redemption_requests`

Registra solicitações de resgate de itens.

```sql
CREATE TABLE redemption_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES reward_items(id),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  debit_transaction_id UUID REFERENCES koin_transactions(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  school_id UUID REFERENCES schools(id)
);
```

---

## ⚙️ Funcionamento do Sistema

### 1. Ganhar Koins Automaticamente (Triggers)

#### Ler um Post → Koins

**Trigger**: `handle_post_read_challenge()`

Quando um aluno lê um post, o sistema:
1. Busca todos os desafios `READ_POST` ativos do aluno
2. Incrementa `current_progress` em cada desafio
3. Se `current_progress >= action_count`, completa o desafio e recompensa Koins

**Código**:
```sql
CREATE TRIGGER on_post_read_trigger
AFTER INSERT ON post_reads
FOR EACH ROW
EXECUTE FUNCTION handle_post_read_challenge();
```

#### Entregar Atividade Aprovada → Koins

**Trigger**: `handle_delivery_challenge()`

Quando uma entrega é aprovada (`review_status = 'APROVADA'`):
1. Busca desafios `SUBMIT_ACTIVITY` ativos do aluno
2. Incrementa progresso
3. Completa e recompensa se atingir meta

**Código**:
```sql
CREATE TRIGGER on_delivery_approved_trigger
AFTER UPDATE ON deliveries
FOR EACH ROW
WHEN (NEW.review_status = 'APROVADA' AND OLD.review_status != 'APROVADA')
EXECUTE FUNCTION handle_delivery_challenge();
```

#### Convidar Amigo para Evento → Koins

**Trigger**: `handle_invite_friend_challenge()`

Quando um aluno convida um amigo:
1. Busca desafios `INVITE_FRIEND` ativos
2. Incrementa progresso
3. Completa e recompensa

#### Participar de Evento → Koins

**Trigger**: `handle_attend_event_challenge()`

Quando presença em evento é registrada:
1. Busca desafios `ATTEND_EVENT` ativos
2. Incrementa progresso
3. Completa e recompensa

### 2. Completar Desafio e Recompensar

**Função**: `complete_challenge_and_reward()`

```sql
CREATE OR REPLACE FUNCTION complete_challenge_and_reward(
  p_student_id UUID,
  p_student_challenge_id UUID,
  p_koin_reward INTEGER,
  p_challenge_title TEXT
)
RETURNS VOID AS $$
DECLARE
  v_student_balance INTEGER;
BEGIN
  -- Buscar saldo atual
  SELECT koins INTO v_student_balance
  FROM profiles
  WHERE id = p_student_id;

  -- Marcar desafio como completo
  UPDATE student_challenges
  SET status = 'COMPLETED', completed_at = NOW()
  WHERE id = p_student_challenge_id;

  -- Criar transação
  INSERT INTO koin_transactions (
    user_id, type, amount, description,
    balance_before, balance_after
  ) VALUES (
    p_student_id, 'BONUS', p_koin_reward,
    'Desafio Concluído: ' || p_challenge_title,
    v_student_balance, v_student_balance + p_koin_reward
  );

  -- Atualizar saldo
  UPDATE profiles
  SET koins = koins + p_koin_reward
  WHERE id = p_student_id;

  -- Criar notificação
  INSERT INTO notifications (
    user_id, type, title, message, role_target
  ) VALUES (
    p_student_id, 'KOIN_BONUS',
    'Desafio Concluído! 🎉',
    'Você ganhou ' || p_koin_reward || ' Koins ao completar: ' || p_challenge_title,
    'ALUNO'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Atribuir Desafios Automaticamente

Quando um desafio é ativado (`is_active = true`), o trigger `on_challenge_activated()` chama `assign_challenge_to_students()` que:

1. Busca todos os alunos ativos
2. Verifica se já possuem o desafio
3. Cria registro em `student_challenges` com status `IN_PROGRESS`
4. Define `expires_at` baseado no tipo (DAILY, WEEKLY, ou NULL para ACHIEVEMENT)

**Código**:
```sql
CREATE TRIGGER challenge_activated
AFTER INSERT OR UPDATE ON challenges
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION on_challenge_activated();
```

### 4. Solicitar Resgate de Item

**Função**: `request_redemption(p_student_id, p_item_id)`

```sql
CREATE OR REPLACE FUNCTION request_redemption(
  p_student_id UUID,
  p_item_id UUID
)
RETURNS VOID AS $$
DECLARE
  item_price INTEGER;
  student_balance INTEGER;
BEGIN
  -- Buscar preço e estoque
  SELECT price_koins INTO item_price
  FROM reward_items
  WHERE id = p_item_id FOR UPDATE;

  -- Buscar saldo do aluno
  SELECT koins INTO student_balance
  FROM profiles
  WHERE id = p_student_id FOR UPDATE;

  -- Validações
  IF student_balance < item_price THEN
    RAISE EXCEPTION 'Saldo de Koins insuficiente';
  END IF;

  -- Criar solicitação de resgate
  INSERT INTO redemption_requests (student_id, item_id, status)
  VALUES (p_student_id, p_item_id, 'PENDING');

  -- Descontar Koins
  INSERT INTO koin_transactions (
    user_id, type, amount, description,
    balance_before, balance_after
  ) VALUES (
    p_student_id, 'REDEMPTION', -item_price,
    'Resgate: ' || (SELECT name FROM reward_items WHERE id = p_item_id),
    student_balance, student_balance - item_price
  );

  -- Atualizar saldo
  UPDATE profiles
  SET koins = koins - item_price
  WHERE id = p_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5. Aprovar/Rejeitar Resgate (Administrador)

**Aprovar**: `approve_redemption(p_redemption_id, p_admin_id)`
- Marca resgate como `APPROVED`
- Reduz estoque do item

**Rejeitar**: `reject_redemption(p_redemption_id, p_admin_id, p_reason)`
- Marca resgate como `REJECTED`
- Cria transação `REFUND` devolvendo Koins ao aluno

---

## 🎮 Interface do Aluno: Nexus Hub

### Localização

**Rota**: `/aluno/nexus`  
**Componente**: `src/pages/aluno/AlunoNexus.tsx`

### Layout

```
┌─────────────────────────────────────────────────────┐
│  🎮 Nexus Hub                                        │
│  Seus Desafios e Recompensas                        │
├─────────────────────────────────────────────────────┤
│  💰 Saldo Atual: 1,250 Koins                        │
│  🔥 Sequência: 5 dias                               │
├─────────────────────────────────────────────────────┤
│  📋 Desafios Ativos                                 │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ 📚 Ler 3 Posts                               │  │
│  │ Progresso: 2/3 ████████░░ 66%               │  │
│  │ Recompensa: 50 Koins 💰                      │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ 📝 Entregar 2 Atividades                     │  │
│  │ Progresso: 1/2 ████████████░░░░░░ 50%       │  │
│  │ Recompensa: 100 Koins 💰                     │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  🏆 Conquistas                                      │
│  ✅ Perfil Completo (+50 Koins)                    │
│  ✅ Primeira Entrega (+30 Koins)                   │
│                                                      │
│  🎁 Loja de Recompensas                             │
│  [Ver Itens Disponíveis]                            │
└─────────────────────────────────────────────────────┘
```

### Hook: `useStudentChallenges`

**Localização**: `src/hooks/useStudentChallenges.ts`

**Funcionalidade**:
- Busca desafios ativos do aluno via RPC `get_student_challenges_with_progress`
- Filtra desafios do ciclo atual (diários de hoje, semanais desta semana)
- Retorna progresso em tempo real

**Código**:
```typescript
export function useStudentChallenges(studentId: string) {
  return useQuery({
    queryKey: ['student-challenges', studentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        'get_student_challenges_with_progress',
        { p_student_id: studentId }
      );

      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
    staleTime: 10 * 1000, // 10 segundos
    refetchInterval: 30 * 1000, // Atualiza a cada 30 segundos
  });
}
```

### Toasts de Feedback

**Toast de Post Lido**:
```typescript
// src/components/feed/PostDetailDrawer.tsx
if (user.role === 'aluno') {
  // Verificar se há desafios READ_POST ativos
  const hasReadPostChallenge = studentChallenges.some(
    c => c.action_target === 'READ_POST' && c.status === 'IN_PROGRESS'
  );

  if (hasReadPostChallenge) {
    toast.success('Post lido! Progresso dos desafios atualizado. Continue lendo para ganhar mais Koins! 👍');
  }
}
```

**Toast de Desafio Completo**:
```typescript
// Exibido via notificação do backend
<KoinEarnedToast
  koinAmount={50}
  message="Desafio Concluído: Ler 3 Posts"
  celebrationType="confetti"
/>
```

---

## 🎁 Loja de Recompensas

### Localização

**Modal**: Acessado via botão "Ver Itens Disponíveis" no Nexus Hub  
**Componente**: `src/components/rewards/RewardItemsModal.tsx`

### Funcionalidades

- ✅ Listar itens disponíveis (estoque > 0, is_active = true)
- ✅ Filtrar por categoria
- ✅ Exibir preço em Koins e estoque restante
- ✅ Botão "Resgatar" (desabilitado se saldo insuficiente)
- ✅ Confirmação antes de resgatar
- ✅ Feedback visual de sucesso

**Código**:
```typescript
const handleRedeemItem = async (itemId: string) => {
  try {
    const { error } = await supabase.rpc('request_redemption', {
      p_student_id: user.id,
      p_item_id: itemId,
    });

    if (error) throw error;

    toast.success('Resgate solicitado! Aguarde aprovação do administrador.');
    refetchBalance();
    refetchItems();
  } catch (error) {
    console.error('Erro ao resgatar:', error);
    toast.error(error.message || 'Erro ao solicitar resgate');
  }
};
```

---

## 🔧 Administração de Desafios

### Criar Novo Desafio

**Página**: `/admin/desafios` (a ser implementado)

**Campos do Formulário**:
- Título (ex: "Ler 3 Posts")
- Descrição (ex: "Leia pelo menos 3 posts para ganhar Koins")
- Tipo: DAILY, WEEKLY, ACHIEVEMENT
- Action Target: READ_POST, SUBMIT_ACTIVITY, etc.
- Contagem de Ações (ex: 3)
- Recompensa em Koins (ex: 50)
- Ícone (nome do ícone Lucide React)

**Ativação Automática**: Ao criar um desafio ativo, o trigger `on_challenge_activated` atribui automaticamente para todos os alunos.

### Gerenciar Resgates

**Página**: `/admin/resgates` (a ser implementado)

**Funcionalidades**:
- Listar resgates pendentes
- Aprovar resgate (reduz estoque, marca como APPROVED)
- Rejeitar resgate (devolve Koins, marca como REJECTED)
- Visualizar histórico de resgates

---

## 🚨 Problemas Comuns e Soluções

### ❌ Problema: Toast de "Post lido" aparece para todos os usuários

**Causa**: Verificação de role ausente.

**Solução**:
```typescript
if (user.role === 'aluno') {
  // Exibir toast apenas para alunos
  toast.success('Post lido! Progresso dos desafios atualizado.');
}
```

### ❌ Problema: Toast aparece mesmo sem desafios ativos

**Causa**: Toast exibido sem verificar se há desafios `READ_POST` ativos.

**Solução**:
```typescript
const hasReadPostChallenge = studentChallenges.some(
  c => c.action_target === 'READ_POST' && c.status === 'IN_PROGRESS'
);

if (hasReadPostChallenge) {
  toast.success('Post lido! Progresso dos desafios atualizado.');
}
```

### ❌ Problema: Desafios completados ontem ainda aparecem como "em progresso"

**Causa**: RPC não filtra por ciclo atual.

**Solução**: Atualizar RPC `get_student_challenges_with_progress` para incluir campo `is_current_cycle` e filtrar no frontend.

### ❌ Problema: Koins descontados mas resgate não criado

**Causa**: Erro na função `request_redemption` após descontar Koins.

**Solução**: Usar transações SQL (`BEGIN...COMMIT`) ou criar redemption_request ANTES de descontar Koins.

---

## 📚 Arquivos Principais

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/aluno/AlunoNexus.tsx` | Nexus Hub (página principal de desafios) |
| `src/hooks/useStudentChallenges.ts` | Hook para buscar desafios do aluno |
| `src/components/rewards/KoinEarnedToast.tsx` | Toast de Koins ganhos |
| `src/components/rewards/RewardItemsModal.tsx` | Modal da loja de recompensas |
| `src/components/rewards/KoinBalanceHeader.tsx` | Componente de saldo no header |
| `src/stores/rewards-store.ts` | Store Zustand para gerenciar estado de Koins |

---

## 🔗 Documentação Relacionada

- [Dashboard de Impacto dos Koins](./koins-impact-dashboard.md)
- [Arquitetura Multi-Tenancy](./multi-tenancy-architecture.md)
- [Insights Preditivos com IA](./ai-predictive-insights.md)

---

**⚠️ LEMBRE-SE**: O sistema de gamificação é exclusivo para alunos. Sempre verificar `user.role === 'aluno'` antes de exibir elementos de gamificação. Koins devem ser isolados por escola via multi-tenancy.
