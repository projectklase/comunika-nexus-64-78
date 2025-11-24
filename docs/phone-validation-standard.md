# Padrão Global de Validação de Telefones

## Regra de Ouro
**TODO campo de telefone que cadastra/edita usuários DEVE usar validação de duplicatas com erro inline.**

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

## Validação Inline (Mensagem Vermelha)

### Padrão de Implementação

**TODO campo de telefone DEVE exibir erro inline ao detectar duplicata:**

```typescript
onBlur={async () => {
  if (phone && validatePhone(phone) === null) {
    const result = await checkDuplicates({ phone }, userId);
    
    if (result.hasSimilarities?.some(s => s.type === 'phone')) {
      const issue = result.similarities.find(s => s.type === 'phone');
      const user = issue?.existingUsers?.[0];
      
      // ✅ ERRO INLINE (seguir padrão do formulário):
      
      // React Hook Form:
      form.setError('phone', { 
        type: 'manual', 
        message: `✕ Telefone já cadastrado${user ? ` (${user.name})` : ''}` 
      });
      
      // Estado manual:
      setErrors(prev => ({ 
        ...prev, 
        phone: `✕ Telefone já cadastrado${user ? ` (${user.name})` : ''}` 
      }));
    }
  }
}
```

### Visual Esperado

```
[Campo de Telefone]
✕ Telefone já cadastrado (Maria Silva)
```

**Importante:** A mensagem inline é PRIORIDADE. Toasts e modais são opcionais/secundários.

## Padrão de Implementação por Tipo de Formulário

### Para Campos Únicos (Secretaria, Professor Rápido)

```typescript
import { useDuplicateCheck } from '@/hooks/useDuplicateCheck';
import { useSchool } from '@/contexts/SchoolContext';
import { validatePhone } from '@/lib/validation';

const { currentSchool } = useSchool();
const { checkDuplicates } = useDuplicateCheck(currentSchool?.id || null);
const [phoneError, setPhoneError] = useState<string | null>(null);

// React Hook Form:
<FormField
  control={form.control}
  name="phone"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Telefone *</FormLabel>
      <FormControl>
        <InputPhone 
          value={field.value}
          onChange={field.onChange}
          onBlur={async () => {
            const phone = field.value?.trim();
            if (phone && validatePhone(phone) === null) {
              const result = await checkDuplicates({ phone });
              
              if (result.hasSimilarities?.some(s => s.type === 'phone')) {
                const issue = result.similarities.find(s => s.type === 'phone');
                const user = issue?.existingUsers?.[0];
                
                form.setError('phone', {
                  type: 'manual',
                  message: `✕ Telefone já cadastrado${user ? ` (${user.name})` : ''}`
                });
              }
            }
          }}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>

// Estado manual:
<InputPhone
  value={phone}
  onChange={(value) => {
    setPhone(value);
    if (phoneError) setPhoneError(null); // Limpa erro ao digitar
  }}
  onBlur={async () => {
    if (phone && validatePhone(phone) === null) {
      const result = await checkDuplicates({ phone });
      
      if (result.hasSimilarities?.some(s => s.type === 'phone')) {
        const issue = result.similarities.find(s => s.type === 'phone');
        const user = issue?.existingUsers?.[0];
        setPhoneError(`✕ Telefone já cadastrado${user ? ` (${user.name})` : ''}`);
      }
    }
  }}
  error={phoneError}
  showError={true}
/>
```

### Para Arrays de Telefones (Professor Completo)

```typescript
const { checkDuplicates } = useDuplicateCheck(currentSchool?.id || null);
const [phoneError, setPhoneError] = useState<string | null>(null);
const [isCheckingPhone, setIsCheckingPhone] = useState(false);

const addPhone = async () => {
  if (phoneError) return; // Bloqueia se houver erro inline
  
  setIsCheckingPhone(true);
  const result = await checkDuplicates({ phone: newPhone }, teacher?.id);
  setIsCheckingPhone(false);
  
  if (result.hasSimilarities?.some(s => s.type === 'phone')) {
    const issue = result.similarities.find(s => s.type === 'phone');
    const user = issue?.existingUsers?.[0];
    setPhoneError(`✕ Telefone já cadastrado${user ? ` (${user.name})` : ''}`);
    return;
  }
  
  // Adiciona à lista
  form.setValue('phones', [...form.getValues('phones') || [], newPhone]);
  setNewPhone('');
};

// Campo com erro inline:
<div className="flex gap-2">
  <div className="flex-1">
    <InputPhone
      value={newPhone}
      onChange={(value) => {
        setNewPhone(value);
        if (phoneError) setPhoneError(null);
      }}
      error={phoneError}
      showError={true}
    />
  </div>
  <Button 
    onClick={addPhone}
    disabled={!newPhone.trim() || isCheckingPhone || phoneError !== null}
  >
    {isCheckingPhone ? <Loader2 className="animate-spin" /> : <Plus />}
  </Button>
</div>
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

// Erro inline nos telefones dos alunos:
<InputPhone
  value={phone}
  onChange={(value) => {
    // ... update form data
    
    // Limpa erro inline ao digitar
    if (errors[`phone_${index}`]) {
      setErrors(prev => {
        const { [`phone_${index}`]: removed, ...rest } = prev;
        return rest;
      });
    }
  }}
  onBlur={async () => {
    if (phone && validatePhone(phone) === null) {
      const result = await checkDuplicates({ phone }, studentId);
      
      if (result.hasSimilarities?.some(s => s.type === 'phone')) {
        const issue = result.similarities.find(s => s.type === 'phone');
        const user = issue?.existingUsers?.[0];
        
        setErrors(prev => ({ 
          ...prev, 
          [`phone_${index}`]: `✕ Telefone já cadastrado${user ? ` (${user.name})` : ''}` 
        }));
      }
    }
  }}
  error={errors[`phone_${index}`]}
  showError={true}
/>
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

| Componente | Tipo de Validação | Erro Inline | Status |
|------------|-------------------|-------------|--------|
| `SecretariaFormModal.tsx` | `onBlur` campo único | ✅ Sim | ✅ Implementado |
| `QuickTeacherModal.tsx` | `onBlur` campo único | ✅ Sim | ✅ Implementado |
| `TeacherFormModal.tsx` | Validação ao adicionar | ✅ Sim | ✅ Implementado |
| `StudentFormSteps.tsx` | Proativa + responsáveis | ✅ Sim | ✅ Implementado |

## Checklist de Validação

Ao adicionar validação de telefone em NOVO componente:

- [ ] Importar `useDuplicateCheck` e `normalizePhoneForComparison`
- [ ] Adicionar estado `phoneError` ou usar `form.setError`
- [ ] Adicionar estado `isChecking` para loading (se aplicável)
- [ ] Validar telefone antes de salvar/adicionar
- [ ] Exibir erro INLINE com nome do usuário duplicado
- [ ] Limpar erro inline ao digitar novamente
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
Resultado esperado: ✕ Telefone já cadastrado (Maria Silva)
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

### Teste 4: Erro Inline ao Adicionar Telefone
```
Formulário de professor
Telefone existente: (11) 11111-1111 (Carlos Albuquerque)
Tentativa de adicionar: 11111111111
Resultado esperado: Campo fica vermelho com "✕ Telefone já cadastrado (Carlos Albuquerque)"
Botão "Adicionar" fica desabilitado
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

2. **Erro inline não aparece**
   - Verificar se o campo está passando `error={phoneError}` e `showError={true}`
   - Confirmar que o estado está sendo atualizado corretamente
   - Checar se o componente `InputPhone` está renderizando a mensagem de erro

3. **Falso positivo (alerta indevido)**
   - Verificar se `excludeUserId` está sendo passado corretamente em modo de edição
   - Confirmar filtro por escola

4. **Performance lenta**
   - Considerar adicionar índice GIN para telefones normalizados
   - Limitar quantidade de resultados retornados

## Referências

- **Implementação Inicial:** Correção de bug de detecção de telefones duplicados (2025-11-24)
- **Validação Inline:** Implementação de erros inline em todos os formulários (2025-11-24)
- **Hook Global:** `src/hooks/usePhoneValidation.ts`
- **Utilitários:** `src/lib/phone-utils.ts`
- **Documentação de Duplicatas:** `docs/duplicate-detection-system.md`
