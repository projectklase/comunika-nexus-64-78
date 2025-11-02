-- Tabela de histórico de logins para analytics em tempo real
CREATE TABLE public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_role app_role NOT NULL,
  logged_at timestamp with time zone DEFAULT now() NOT NULL,
  ip_address text,
  user_agent text,
  session_id text,
  created_at timestamp with time zone DEFAULT now()
);

-- Índices para performance otimizada
CREATE INDEX idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX idx_login_history_logged_at ON public.login_history(logged_at DESC);
CREATE INDEX idx_login_history_user_role ON public.login_history(user_role);
CREATE INDEX idx_login_history_composite ON public.login_history(user_role, logged_at DESC);

-- Habilitar RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Administrador pode ver todos os logins
CREATE POLICY "Administrador pode ver todos os logins"
  ON public.login_history FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'));

-- Secretaria pode ver todos os logins
CREATE POLICY "Secretaria pode ver todos os logins"
  ON public.login_history FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'secretaria'));

-- Usuários podem ver seus próprios logins
CREATE POLICY "Usuários podem ver seus próprios logins"
  ON public.login_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Sistema pode inserir logins (qualquer usuário autenticado pode registrar seu próprio login)
CREATE POLICY "Sistema pode inserir logins"
  ON public.login_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());