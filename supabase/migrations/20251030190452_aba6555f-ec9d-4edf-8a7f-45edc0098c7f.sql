-- ============================================================
-- MIGRAÇÃO: ADMINISTRADOR - PODER TOTAL (RLS COMPLETO)
-- Total de políticas adicionadas: 42
-- 
-- ⚠️ ATENÇÃO: Este script adiciona políticas NOVAS para o role
-- 'administrador', sem modificar as existentes para outros roles.
-- ============================================================

-- ============================================================
-- CATEGORIA 1: MÓDULO DE GESTÃO (CRUD COMPLETO)
-- Tabelas de configuração e cadastros
-- ============================================================

-- 1.1 CLASSES (Adicionar INSERT/UPDATE/DELETE, já tem SELECT)
CREATE POLICY "Administrador pode criar turmas"
  ON public.classes FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Administrador pode atualizar turmas"
  ON public.classes FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Administrador pode deletar turmas"
  ON public.classes FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- 1.2 CLASS_STUDENTS (Adicionar ALL - faltava tudo)
CREATE POLICY "Administrador pode gerenciar alunos de turmas"
  ON public.class_students FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- 1.3 CLASS_SUBJECTS (Adicionar ALL - faltava tudo)
CREATE POLICY "Administrador pode gerenciar matérias de turmas"
  ON public.class_subjects FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- 1.4 LEVELS (Adicionar ALL - faltava tudo)
CREATE POLICY "Administrador pode gerenciar níveis"
  ON public.levels FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- 1.5 MODALITIES (Adicionar ALL - faltava tudo)
CREATE POLICY "Administrador pode gerenciar modalidades"
  ON public.modalities FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- 1.6 SUBJECTS (Adicionar ALL - faltava tudo)
CREATE POLICY "Administrador pode gerenciar matérias"
  ON public.subjects FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- 1.7 PROGRAMS (Adicionar ALL - faltava tudo)
CREATE POLICY "Administrador pode gerenciar programas"
  ON public.programs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- 1.8 GUARDIANS (Adicionar ALL - faltava tudo)
CREATE POLICY "Administrador pode gerenciar responsáveis"
  ON public.guardians FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- 1.9 FEATURE_FLAGS (Adicionar ALL - faltava tudo)
CREATE POLICY "Administrador pode gerenciar feature flags"
  ON public.feature_flags FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- 1.10 IMPORT_HISTORY (Adicionar ALL - faltava tudo)
CREATE POLICY "Administrador pode gerenciar histórico de importações"
  ON public.import_history FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- ============================================================
-- CATEGORIA 2: MÓDULO DE RECOMPENSAS (CRUD COMPLETO)
-- Corrige falha ao criar/salvar itens na loja
-- ============================================================

-- 2.1 REWARD_ITEMS (Adicionar ALL - faltava tudo)
CREATE POLICY "Administrador pode gerenciar itens da loja"
  ON public.reward_items FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- 2.2 REDEMPTION_REQUESTS (Adicionar ALL - faltava tudo)
CREATE POLICY "Administrador pode gerenciar resgates"
  ON public.redemption_requests FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- ============================================================
-- CATEGORIA 3: MÓDULO DE EVENTOS (CRUD COMPLETO)
-- ============================================================

-- 3.1 EVENT_ATTENDANCE (Adicionar ALL - faltava tudo)
CREATE POLICY "Administrador pode gerenciar presença em eventos"
  ON public.event_attendance FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- 3.2 EVENT_INVITATIONS (Adicionar ALL - faltava tudo)
CREATE POLICY "Administrador pode gerenciar convites de eventos"
  ON public.event_invitations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- ============================================================
-- CATEGORIA 4: MÓDULO DE AUDITORIA (LEITURA TOTAL - SELECT)
-- Corrige "Histórico", "Resgates", "Analytics" zerados
-- ============================================================

-- 4.1 AUDIT_EVENTS (Adicionar INSERT - já tem SELECT)
CREATE POLICY "Administrador pode criar eventos de auditoria"
  ON public.audit_events FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- 4.2 POSTS (Adicionar INSERT/UPDATE/DELETE - já tem SELECT)
CREATE POLICY "Administrador pode criar posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Administrador pode atualizar posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Administrador pode deletar posts"
  ON public.posts FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- 4.3 DELIVERIES (Adicionar SELECT - faltava tudo)
CREATE POLICY "Administrador pode ver todas as entregas"
  ON public.deliveries FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- 4.4 DELIVERY_ATTACHMENTS (Adicionar SELECT - faltava tudo)
CREATE POLICY "Administrador pode ver todos os anexos de entregas"
  ON public.delivery_attachments FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- 4.5 POST_READS (Adicionar SELECT - faltava tudo)
CREATE POLICY "Administrador pode ver todas as leituras de posts"
  ON public.post_reads FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- 4.6 NOTIFICATIONS (Adicionar SELECT - faltava tudo)
CREATE POLICY "Administrador pode ver todas as notificações"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- 4.7 EVENT_CONFIRMATIONS (Adicionar SELECT - faltava tudo)
CREATE POLICY "Administrador pode ver todas as confirmações de eventos"
  ON public.event_confirmations FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- 4.8 STUDENT_CHALLENGES (Adicionar SELECT - faltava tudo)
CREATE POLICY "Administrador pode ver todos os desafios dos alunos"
  ON public.student_challenges FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- 4.9 SYSTEM_LOGS (Adicionar SELECT - faltava tudo)
CREATE POLICY "Administrador pode ver todos os logs do sistema"
  ON public.system_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- ============================================================
-- FIM DA MIGRAÇÃO
-- Total de políticas adicionadas: 42
-- ============================================================