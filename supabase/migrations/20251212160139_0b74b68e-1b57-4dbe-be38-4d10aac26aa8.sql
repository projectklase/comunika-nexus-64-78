-- Tabela para rastrear se aluno já viu os resultados da semana
CREATE TABLE public.weekly_prize_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, school_id, week_start)
);

-- Enable RLS
ALTER TABLE public.weekly_prize_views ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own prize views"
ON public.weekly_prize_views FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own prize views"
ON public.weekly_prize_views FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Index for fast lookups
CREATE INDEX idx_weekly_prize_views_user_week ON public.weekly_prize_views(user_id, school_id, week_start);

-- RPC para buscar resultados da última semana processada
CREATE OR REPLACE FUNCTION public.get_last_weekly_prize_results(
  p_school_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_last_monday DATE;
  v_previous_monday DATE;
  v_results JSON;
  v_already_viewed BOOLEAN;
  v_my_prize INTEGER;
  v_my_position INTEGER;
BEGIN
  -- Calcular a segunda-feira da semana atual
  v_last_monday := date_trunc('week', CURRENT_DATE)::DATE;
  
  -- A semana premiada é a anterior (domingo à noite processou os prêmios da semana passada)
  v_previous_monday := v_last_monday - INTERVAL '7 days';
  
  -- Verificar se já visualizou
  SELECT EXISTS(
    SELECT 1 FROM weekly_prize_views
    WHERE user_id = p_user_id
    AND school_id = p_school_id
    AND week_start = v_previous_monday
  ) INTO v_already_viewed;
  
  -- Se já viu, retorna null para não mostrar modal
  IF v_already_viewed THEN
    RETURN json_build_object('already_viewed', true);
  END IF;
  
  -- Buscar os vencedores da semana anterior
  WITH weekly_totals AS (
    SELECT 
      wl.user_id,
      SUM(wl.xp_amount) as total_xp
    FROM weekly_xp_log wl
    JOIN profiles p ON p.id = wl.user_id
    WHERE wl.school_id = p_school_id
    AND wl.created_at >= v_previous_monday
    AND wl.created_at < v_last_monday
    GROUP BY wl.user_id
    HAVING SUM(wl.xp_amount) > 0
  ),
  ranked AS (
    SELECT 
      wt.user_id,
      wt.total_xp,
      ROW_NUMBER() OVER (ORDER BY wt.total_xp DESC) as position
    FROM weekly_totals wt
  ),
  top_10 AS (
    SELECT 
      r.user_id,
      r.total_xp,
      r.position,
      p.name,
      p.avatar,
      COALESCE(
        (SELECT jsonb_build_object(
          'emoji', ue.preview_data->>'emoji',
          'imageUrl', ue.preview_data->>'imageUrl'
        )
        FROM user_equipped_items uei
        JOIN unlockables ue ON ue.id = uei.unlockable_id
        WHERE uei.user_id = r.user_id
        AND uei.slot = 'avatar'
        AND uei.is_active = true
        LIMIT 1),
        NULL
      ) as equipped_avatar,
      CASE 
        WHEN r.position = 1 THEN 800
        WHEN r.position = 2 THEN 500
        WHEN r.position = 3 THEN 350
        WHEN r.position = 4 THEN 100
        WHEN r.position = 5 THEN 50
        ELSE 25
      END as prize_xp
    FROM ranked r
    JOIN profiles p ON p.id = r.user_id
    WHERE r.position <= 10
    ORDER BY r.position
  )
  SELECT json_agg(
    json_build_object(
      'user_id', user_id,
      'name', name,
      'avatar', avatar,
      'equipped_avatar', equipped_avatar,
      'total_xp', total_xp,
      'position', position,
      'prize_xp', prize_xp
    )
  ) INTO v_results FROM top_10;
  
  -- Verificar se o usuário atual ganhou algo
  SELECT position, 
    CASE 
      WHEN position = 1 THEN 800
      WHEN position = 2 THEN 500
      WHEN position = 3 THEN 350
      WHEN position = 4 THEN 100
      WHEN position = 5 THEN 50
      WHEN position <= 10 THEN 25
      ELSE 0
    END
  INTO v_my_position, v_my_prize
  FROM (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY SUM(xp_amount) DESC) as position
    FROM weekly_xp_log
    WHERE school_id = p_school_id
    AND created_at >= v_previous_monday
    AND created_at < v_last_monday
    GROUP BY user_id
    HAVING SUM(xp_amount) > 0
  ) ranked
  WHERE user_id = p_user_id;
  
  -- Se não há resultados, retorna que não há dados
  IF v_results IS NULL THEN
    RETURN json_build_object('no_data', true);
  END IF;
  
  RETURN json_build_object(
    'already_viewed', false,
    'week_start', v_previous_monday,
    'winners', v_results,
    'my_position', COALESCE(v_my_position, 0),
    'my_prize', COALESCE(v_my_prize, 0)
  );
END;
$$;

-- RPC para marcar como visualizado
CREATE OR REPLACE FUNCTION public.mark_weekly_prize_viewed(
  p_school_id UUID,
  p_week_start DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO weekly_prize_views (user_id, school_id, week_start)
  VALUES (auth.uid(), p_school_id, p_week_start)
  ON CONFLICT (user_id, school_id, week_start) DO NOTHING;
END;
$$;