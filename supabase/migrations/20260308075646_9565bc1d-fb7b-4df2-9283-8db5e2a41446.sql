
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Leads (schools/businesses) table
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  address TEXT,
  website TEXT,
  detected_website TEXT,
  website_confirmed BOOLEAN DEFAULT false,
  website_type TEXT,
  discovered BOOLEAN DEFAULT false,
  domain_validated BOOLEAN DEFAULT false,
  domain_active BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  school_type TEXT DEFAULT 'unknown',
  similarity_score NUMERIC,
  quality_score JSONB,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  phone TEXT,
  emails TEXT,
  category TEXT,
  rating NUMERIC,
  rating_info TEXT,
  open_hours TEXT,
  facebook TEXT,
  instagram TEXT,
  twitter TEXT,
  social_medias TEXT,
  featured_image TEXT,
  trust_score NUMERIC,
  trust_reason TEXT,
  call_status TEXT DEFAULT 'pending',
  call_notes TEXT,
  pipeline_stage TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own leads" ON public.schools FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own leads" ON public.schools FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own leads" ON public.schools FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own leads" ON public.schools FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_schools_user_id ON public.schools(user_id);
CREATE INDEX idx_schools_status ON public.schools(status);
CREATE INDEX idx_schools_pipeline ON public.schools(pipeline_stage);
