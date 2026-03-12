-- Add follow_up_date column for reminders
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS follow_up_date timestamp with time zone DEFAULT NULL;

-- Add follow_up_notes column
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS follow_up_notes text DEFAULT NULL;