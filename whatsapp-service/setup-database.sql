-- Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This creates the table to persistently store WhatsApp session data

CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name TEXT UNIQUE NOT NULL,
  session_data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (the whatsapp-service uses SUPABASE_SERVICE_KEY)
CREATE POLICY "Service role full access" ON public.whatsapp_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_name ON public.whatsapp_sessions(session_name);
