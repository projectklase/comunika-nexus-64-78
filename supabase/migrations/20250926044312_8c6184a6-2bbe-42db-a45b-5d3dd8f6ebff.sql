-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('secretaria', 'professor', 'aluno')),
  avatar TEXT,
  phone TEXT,
  class_id TEXT,
  default_school_slug TEXT,
  preferences JSONB DEFAULT '{
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
  }'::jsonb,
  must_change_password BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles are viewable by everyone (for collaboration features)
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Users can insert their own profile  
CREATE POLICY "Users can insert their own profile"
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Novo Usuário'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'aluno')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert secretaria user data for testing
INSERT INTO auth.users (
  id, 
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'secretaria@comunika.com',
  crypt('123456', gen_salt('bf')),
  now(),
  now(), 
  now(),
  '{"name": "Maria Silva", "role": "secretaria"}'::jsonb,
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;