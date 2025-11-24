# Gerenciamento de Secretarias pelo Administrador

## Visão Geral
Sistema que permite ao administrador criar e gerenciar usuários com role `secretaria`.

## Funcionalidades

### 1. Criar Nova Secretaria
- Formulário com validação completa (Zod)
- Campos: nome, email, senha, telefone
- Validações:
  - Nome: 3-100 caracteres, apenas letras
  - Email: formato válido
  - Senha: mínimo 8 caracteres
  - Telefone: formato internacional (opcional)

### 2. Listar Secretarias
- Tabela com avatar, nome, email, telefone, status, data de criação
- Filtros:
  - Busca por nome/email
  - Status: Todos, Ativos, Inativos
- Estatísticas: Total, Ativos, Inativos

### 3. Ações
- **Arquivar**: Desativa o usuário (is_active = false)
- **Reativar**: Reativa usuário arquivado
- Confirmações via AlertDialog

## Segurança

### RLS Policies
1. **Administrador pode ver roles de secretaria**: SELECT em `user_roles` WHERE role='secretaria'
2. **Administrador pode criar roles de secretaria**: INSERT em `user_roles` para role='secretaria'
3. **Administrador pode deletar roles de secretaria**: DELETE em `user_roles` WHERE role='secretaria'
4. **Administrador pode criar profiles**: INSERT em `profiles`

### Edge Function
- Modificada `create-demo-user` para aceitar chamadas de `administrador` e `secretaria`
- **Regra de negócio crítica**: Apenas `administrador` pode criar usuários com role `secretaria`
- Validação dupla: no frontend e no backend

### Auditoria
Todos os eventos são logados em `audit_events`:
- CREATE: Criação de nova secretaria
- ARCHIVE: Arquivamento de secretaria
- UPDATE: Reativação de secretaria

## Arquivos Criados/Modificados

### Novos Arquivos
1. `src/types/secretaria.ts` - Tipos TypeScript
2. `src/hooks/useSecretarias.ts` - Hook para CRUD
3. `src/components/admin/SecretariaFormModal.tsx` - Modal de criação
4. `src/pages/admin/SecretariasPage.tsx` - Página principal
5. `docs/admin-manage-secretaria.md` - Esta documentação

### Arquivos Modificados
1. `supabase/functions/create-demo-user/index.ts` - Regra de negócio
2. `src/App.tsx` - Adicionada rota `/admin/gerenciar-secretarias`
3. `src/components/Layout/AppSidebar.tsx` - Item de menu "Gerenciar Secretarias"

### Migração SQL
- 4 RLS policies para administrador gerenciar secretarias
- 1 índice para performance em `user_roles.role`

## Navegação
- **Rota**: `/admin/gerenciar-secretarias`
- **Acesso**: Apenas role `administrador`
- **Menu**: "Gerenciar Secretarias" (ícone Shield)

## Testes

### Funcionais
- [ ] Criar secretaria com sucesso
- [ ] Validação de campos inválidos
- [ ] Filtrar por nome/email
- [ ] Filtrar por status (ativo/inativo)
- [ ] Arquivar secretaria
- [ ] Reativar secretaria
- [ ] Auditoria registrada corretamente

### Segurança
- [ ] Secretaria NÃO pode criar outras secretarias
- [ ] Secretaria pode criar professores/alunos
- [ ] Admin pode criar qualquer role
- [ ] Apenas admin acessa `/admin/gerenciar-secretarias`

### Edge Cases
- [ ] Email duplicado retorna erro apropriado
- [ ] Senha fraca é rejeitada
- [ ] Telefone inválido é rejeitado
- [ ] Formulário limpa após sucesso

## Funcionalidades Implementadas (Atualização 2025-01-24)

### ✅ Editar Secretaria
- Modal `SecretariaFormModal` aceita prop `secretaria` para modo de edição
- Botão "Editar" no menu dropdown de ações
- Validação de senha desativada no modo de edição
- Função `updateSecretaria` do `useSecretarias` para persistir mudanças
- Audit logging de edições

### ✅ Deletar Secretaria
- Função `deleteSecretaria` em `useSecretarias.ts`
- Usa edge function `delete-user` com `SUPABASE_SERVICE_ROLE_KEY`
- `AlertDialog` de confirmação para segurança
- Audit logging de exclusões
- Opção "Excluir" no menu de ações

### ✅ Detecção de Duplicatas
- Validação inline em tempo real para email (blocking)
- Hook `useDuplicateCheck` para validação de email duplicado
- Modal `DuplicateWarning` para alertas de duplicatas
- Validação backend na edge function `create-demo-user`
- Bloqueio de cadastro se email já existir
- Ver documentação completa: [Sistema de Detecção de Duplicatas](./duplicate-detection-system.md)

## Próximos Passos (Futuro)
1. ✅ ~~Editar informações da secretaria~~ (IMPLEMENTADO)
2. ✅ ~~Deletar secretaria~~ (IMPLEMENTADO)
3. Resetar senha da secretaria
4. Visualizar logs de auditoria específicos da secretaria
5. Exportar lista de secretarias para CSV
6. Permissões granulares (ex: algumas secretarias não podem criar professores)
