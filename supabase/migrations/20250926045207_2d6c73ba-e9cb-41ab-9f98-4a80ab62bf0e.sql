-- Insert secretaria profile after creating auth user
INSERT INTO public.profiles (
  id,
  name,
  email,
  role,
  avatar,
  preferences
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Maria Silva',
  'secretaria@comunika.com',
  'secretaria',
  'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
  '{
    "notifications": {
      "email": true,
      "push": true,
      "dailySummary": true,
      "posts": true,
      "activities": true,
      "reminders": true
    },
    "ui": {
      "theme": "dark",
      "language": "pt-BR",
      "timezone": "America/Sao_Paulo",
      "dateFormat": "DD/MM/YYYY"
    }
  }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  avatar = EXCLUDED.avatar,
  preferences = EXCLUDED.preferences;