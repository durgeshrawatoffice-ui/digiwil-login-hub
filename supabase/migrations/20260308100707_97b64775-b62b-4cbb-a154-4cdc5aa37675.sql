
-- Nurture sequences table
CREATE TABLE public.nurture_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sequence steps
CREATE TABLE public.sequence_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.nurture_sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 1,
  delay_days INTEGER NOT NULL DEFAULT 1,
  subject TEXT,
  body TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sequence enrollments (which leads are in which sequence)
CREATE TABLE public.sequence_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sequence_id UUID NOT NULL REFERENCES public.nurture_sequences(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_step_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(sequence_id, school_id)
);

-- Landing pages table
CREATE TABLE public.landing_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  headline TEXT NOT NULL DEFAULT 'Get in Touch',
  description TEXT,
  button_text TEXT NOT NULL DEFAULT 'Submit',
  fields JSONB NOT NULL DEFAULT '["name","email","phone"]'::jsonb,
  thank_you_message TEXT DEFAULT 'Thank you for your submission!',
  is_published BOOLEAN NOT NULL DEFAULT false,
  submissions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, slug)
);

-- Landing page submissions
CREATE TABLE public.landing_page_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.nurture_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sequences" ON public.nurture_sequences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage sequence steps" ON public.sequence_steps FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.nurture_sequences WHERE id = sequence_steps.sequence_id AND user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.nurture_sequences WHERE id = sequence_steps.sequence_id AND user_id = auth.uid()));
CREATE POLICY "Users can manage own enrollments" ON public.sequence_enrollments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own landing pages" ON public.landing_pages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can submit to published pages" ON public.landing_page_submissions FOR INSERT TO anon, authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.landing_pages WHERE id = landing_page_submissions.page_id AND is_published = true));
CREATE POLICY "Page owners can view submissions" ON public.landing_page_submissions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.landing_pages WHERE id = landing_page_submissions.page_id AND user_id = auth.uid()));
