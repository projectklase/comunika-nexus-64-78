# Padrão Global de Validação de Telefones

## Regra de Ouro
**TODO campo de telefone que cadastra/edita usuários DEVE usar validação de duplicatas.**

## Arquitetura

### Funções Utilitárias

#### `src/lib/phone-utils.ts`
- `normalizePhoneForComparison(phone)` - Remove toda formatação, retorna apenas dígitos
- `arePhonesSame(phone1, phone2)` - Compara dois telefones após normalização

#### `src/hooks/usePhoneValidation.ts`
- `validatePhoneWithDuplicateCheck()` - Validação completa de formato + duplicatas
- `isChecking` - Estado de loading para feedback visual

#### `src/hooks/useDuplicateCheck.ts`
- `checkDuplicates()` - Verificação de duplicatas com isolamento multi-tenant
- Busca TODOS os perfis da escola e filtra manualmente após normalização

## Padrão de Implementação

### Para Campos Únicos (Secretaria, Professor Rápido)

```typescript
import { usePhoneValidation } from '@/hooks/usePhoneValidation';
import { useState } from 'react';

const { validatePhoneWithDuplicateCheck, isChecking } = usePhoneValidation();
const [showDuplicateModal, setShowDuplicateModal] = useState(false);
const [duplicateCheck, setDuplicateCheck] = useState<any>(null);

// No campo de telefone:
<InputPhone
  value={phone}
  onChange={setPhone}
  onBlur={async () => {
    if (phone) {
      const isValid = await validatePhoneWithDuplicateCheck(phone, undefined, {
        showToast: true,
        onDuplicate: (result) => {
          setDuplicateCheck(result);
          setShowDuplicateModal(true);
        }
      });
    }
  }}
/>

// Modal de alerta:
{showDuplicateModal && duplicateCheck && (
  <DuplicateWarning
    type="critical"
    fieldType="phone"
    message="Telefone já cadastrado"
    details={duplicateCheck}
    onCancel={() => setShowDuplicateModal(false)}
    onConfirm={() => setShowDuplicateModal(false)}
  />
)}
```

### Para Arrays de Telefones (Professor Completo)

```typescript
const { validatePhoneWithDuplicateCheck, isChecking } = usePhoneValidation();

const addPhone = async () => {
  if (!newPhone.trim()) return;
  
  const isValid = await validatePhoneWithDuplicateCheck(
    newPhone,
    teacher?.id, // Exclui o professor em edição
    {
      showToast: true,
      onDuplicate: (result) => {
        setDuplicateCheck(result);
        setShowDuplicateModal(true);
      }
    }
  );
  
  if (isValid) {
    // Adiciona à lista apenas se válido
    const currentPhones = form.getValues('phones') || [];
    form.setValue('phones', [...currentPhones, newPhone.trim()]);
    setNewPhone('');
  }
};

// Botão com loading
<Button 
  onClick={addPhone}
  disabled={!newPhone.trim() || isChecking}
>
  {isChecking ? <Loader2 className="animate-spin" /> : <Plus />}
  Adicionar
</Button>
```

### Para Responsáveis (Cadastro de Alunos)

```typescript
import { normalizePhoneForComparison } from '@/lib/phone-utils';

// Na função checkGuardianDuplicates:
const checkGuardianDuplicates = async (guardianPhone?: string) => {
  // ❌ ERRADO: Usar .eq() não funciona com formatação
  // query = query.eq('phone', cleanPhone);
  
  // ✅ CORRETO: Buscar todos e filtrar manualmente
  query = query.not('phone', 'is', null);
  
  const { data: existingGuardians } = await query;
  
  if (guardianPhone) {
    const normalizedInput = normalizePhoneForComparison(guardianPhone);
    filteredGuardians = existingGuardians.filter(g => {
      const normalizedDb = normalizePhoneForComparison(g.phone);
      return normalizedDb === normalizedInput && normalizedDb.length > 0;
    });
  }
};
```

## Isolamento Multi-Tenant

### Princípios Obrigatórios

1. **SEMPRE filtrar por `currentSchool.id`**
   - Todas as queries devem incluir `.eq('current_school_id', currentSchool.id)`
   - Garante que telefones duplicados só alertem dentro da mesma escola

2. **NUNCA usar `.eq('phone', value)` diretamente**
   - Telefones podem estar salvos com formatação diferente
   - Exemplo: `"(11) 11111-1111"` vs `"11111111111"`
   - Solução: Buscar TODOS e filtrar manualmente após normalização

3. **Normalizar AMBOS os lados da comparação**
   - Input do usuário: `normalizePhoneForComparison(inputPhone)`
   - Banco de dados: `normalizePhoneForComparison(dbPhone)`
   - Comparar apenas dígitos: `"11111111111" === "11111111111"`

## Componentes Implementados

| Componente | Tipo de Validação | Status |
|------------|-------------------|--------|
| `SecretariaFormModal.tsx` | `onBlur` campo único | ✅ Implementado |
| `QuickTeacherModal.tsx` | `onBlur` campo único | ✅ Implementado |
| `TeacherFormModal.tsx` | Validação ao adicionar telefone | ✅ Implementado |
| `StudentFormSteps.tsx` | Proativa por step + responsáveis | ✅ Implementado |

## Checklist de Validação

Ao adicionar validação de telefone em NOVO componente:

- [ ] Importar `usePhoneValidation` ou funções de `phone-utils.ts`
- [ ] Adicionar estado `isChecking` para loading
- [ ] Validar telefone antes de salvar/adicionar
- [ ] Exibir modal `DuplicateWarning` em caso de duplicata
- [ ] Filtrar queries por `currentSchool.id`
- [ ] Normalizar telefones antes de comparar
- [ ] Testar com telefones formatados vs não-formatados
- [ ] Testar isolamento multi-tenant (escolas diferentes)

## Exemplos de Casos de Teste

### Teste 1: Detecção de Duplicata com Formatação Diferente
```
Escola: Colegio ABC
Usuário existente: Maria Silva - (11) 11111-1111
Tentativa de criar: João Silva - 11111111111
Resultado esperado: ⚠️ Modal de alerta
```

### Teste 2: Isolamento Multi-Tenant
```
Escola A: Maria Silva - (11) 11111-1111
Escola B: João Silva - (11) 11111-1111
Resultado esperado: ✅ Ambos cadastrados sem alerta (escolas diferentes)
```

### Teste 3: Responsável Duplicado
```
Escola: Colegio ABC
Aluno 1: Ana Silva - Responsável: Helena (11) 11111-1111
Tentativa: João Silva - Responsável: Helena (11111111111)
Resultado esperado: 💡 Modal de sugestão de vínculo familiar
```

## Debugging

### Logs Importantes
```typescript
console.log('[Phone Validation] Input:', phone);
console.log('[Phone Validation] Normalized Input:', normalizePhoneForComparison(phone));
console.log('[Phone Validation] DB Phone:', dbPhone);
console.log('[Phone Validation] Normalized DB:', normalizePhoneForComparison(dbPhone));
console.log('[Phone Validation] Match:', normalizedInput === normalizedDb);
```

### Problemas Comuns

1. **Duplicata não detectada**
   - Verificar se ambos os lados estão sendo normalizados
   - Confirmar que `currentSchool.id` está correto
   - Checar se query está buscando TODOS os perfis

2. **Falso positivo (alerta indevido)**
   - Verificar se `excludeUserId` está sendo passado corretamente em modo de edição
   - Confirmar filtro por escola

3. **Performance lenta**
   - Considerar adicionar índice GIN para telefones normalizados
   - Limitar quantidade de resultados retornados

## Referências

- **Implementação Inicial:** Correção de bug de detecção de telefones duplicados (2025-11-24)
- **Hook Global:** `src/hooks/usePhoneValidation.ts`
- **Utilitários:** `src/lib/phone-utils.ts`
- **Documentação de Duplicatas:** `docs/duplicate-detection-system.md`
