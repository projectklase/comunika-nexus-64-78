# Implementação de Segurança - Sistema de Gestão Escolar

## 🔒 Mudanças de Segurança Implementadas

### 1. Sistema de Roles Separado

**Problema**: Anteriormente, roles eram armazenados na tabela `profiles`, permitindo potencial escalação de privilégios.

**Solução**: Criada tabela `user_roles` separada com:
- Enum `app_role` com valores: `secretaria`, `professor`, `aluno`
- Foreign key para `auth.users` com `ON DELETE CASCADE`
- Políticas RLS rigorosas
- Função `has_role()` com `SECURITY DEFINER` para evitar recursão de RLS

### 2. Verificação de Permissões na Edge Function

**Mudanças em `create-demo-user`**:
- ✅ Verifica token de autenticação
- ✅ Valida se usuário tem role `secretaria`
- ✅ Rejeita requisições não autorizadas (401)
- ✅ Rejeita usuários sem permissão (403)
- ✅ Validações de entrada rigorosas

**Validações Implementadas**:
- Email: formato válido, sem caracteres perigosos, máximo 254 caracteres
- Nome: mínimo 3 caracteres, máximo 100 caracteres, sem XSS
- Senha: mínimo 6 caracteres
- Role: apenas valores válidos ('secretaria', 'professor', 'aluno')

### 3. Validações Robustas no Frontend

**Novo arquivo**: `src/lib/validation.ts` expandido com:

#### Validação de Nome (`validateName`)
- Mínimo 3 caracteres, máximo 100
- Requer nome e sobrenome
- Remove caracteres perigosos (XSS prevention)
- Normaliza espaços

#### Validação de Email (`validateEmail`)
- Formato RFC compliant
- Máximo 254 caracteres
- Remove caracteres perigosos
- Validação em tempo real

#### Validação de CPF (`validateCPF`)
- Valida dígitos verificadores
- Rejeita CPFs conhecidos inválidos (111.111.111-11, etc)
- Formata automaticamente

#### Validação de Telefone (`validatePhone`)
- Aceita fixo (10 dígitos) e celular (11 dígitos)
- Remove caracteres não numéricos
- Formata automaticamente

#### Validação de CEP (`validateZipCode`)
- Exatamente 8 dígitos
- Formata automaticamente (00000-000)

#### Validação de Matrícula (`validateEnrollmentNumber`)
- Mínimo 3, máximo 20 caracteres
- Apenas letras, números e hífens
- Sanitização automática

#### Sanitização (`sanitizeString`)
- Remove caracteres perigosos: `< > " ' \``
- Limita comprimento
- Trim automático

### 4. Formulário de Estudantes Melhorado

**Validações em Tempo Real**:
- Feedback visual instantâneo (border vermelho em erros)
- Mensagens de erro específicas
- Contadores de caracteres
- Formatação automática (CPF, CEP, telefone)
- Validação por etapa antes de avançar

**Campos com Limites**:
- Nome: 100 caracteres
- Email: 254 caracteres
- CPF: 14 caracteres (formatado)
- Matrícula: 20 caracteres
- CEP: 9 caracteres (formatado)
- Telefone: formato BR (11) 99999-9999

### 5. Políticas RLS Atualizadas

Todas as políticas críticas agora usam `has_role()`:

```sql
-- Exemplo de política segura
CREATE POLICY "Secretaria pode gerenciar Turmas"
ON public.classes
FOR ALL
USING (public.has_role(auth.uid(), 'secretaria'));
```

**Tabelas Protegidas**:
- ✅ `profiles`
- ✅ `classes`
- ✅ `class_students`
- ✅ `user_roles`

### 6. Migração de Dados

Dados existentes de roles foram migrados automaticamente:
```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role
FROM public.profiles
WHERE role IN ('secretaria', 'professor', 'aluno')
```

### 7. Triggers Automáticos

**`handle_new_user_role()`**: Cria entrada em `user_roles` automaticamente quando um usuário é criado.

## 🔐 Fluxo de Criação de Aluno

1. **Frontend**: Usuário preenche formulário com validações em tempo real
2. **Validação Cliente**: Formulário valida todos os campos antes de submeter
3. **Edge Function**: Verifica se usuário logado tem role `secretaria`
4. **Validação Servidor**: Edge function valida novamente todos os dados
5. **Criação Auth**: Cria usuário em `auth.users` via Admin API
6. **Trigger**: Automatically cria entrada em `user_roles`
7. **Perfil**: Cria/atualiza entrada em `profiles`
8. **Resposta**: Retorna sucesso com dados do usuário criado

## ⚠️ Avisos de Segurança Pendentes

### Proteção de Senhas Vazadas (WARN)
**Status**: Desabilitado  
**Recomendação**: Habilitar proteção contra senhas vazadas no Supabase
**Como corrigir**: 
1. Acessar Dashboard do Supabase
2. Authentication > Settings
3. Habilitar "Password Strength and Leaked Password Protection"

Link: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## 📋 Checklist de Segurança

- [x] Roles em tabela separada
- [x] Função `has_role()` com SECURITY DEFINER
- [x] RLS policies atualizadas
- [x] Verificação de permissões na edge function
- [x] Validações robustas no frontend
- [x] Validações robustas no backend
- [x] Sanitização de inputs (XSS prevention)
- [x] Limites de caracteres
- [x] Formatação automática de dados
- [x] Feedback visual de erros
- [x] Triggers automáticos para roles
- [ ] Proteção de senhas vazadas (requer configuração manual)

## 🧪 Como Testar

### Teste 1: Apenas Secretaria Cria Logins
1. Login como `secretaria@comunika.com`
2. Ir para Cadastros > Alunos
3. Criar novo aluno - ✅ Deve funcionar

4. Logout e login como professor/aluno
5. Tentar criar aluno via API - ❌ Deve retornar 403 Forbidden

### Teste 2: Validações de Formulário
1. Tentar nome com < 3 caracteres - ❌ Deve mostrar erro
2. Tentar email inválido - ❌ Deve mostrar erro
3. Tentar CPF inválido (111.111.111-11) - ❌ Deve mostrar erro
4. Preencher corretamente - ✅ Deve permitir salvar

### Teste 3: Sanitização
1. Tentar inserir `<script>alert('xss')</script>` no nome
2. Caracteres perigosos devem ser removidos automaticamente
3. Salvar sem erros

## 📚 Referências

- [Supabase RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Preventing Privilege Escalation](https://supabase.com/docs/guides/auth/managing-user-data#advanced-techniques)
- [Input Validation OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
