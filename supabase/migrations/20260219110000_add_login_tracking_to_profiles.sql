-- Add login tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_ip TEXT,
  ADD COLUMN IF NOT EXISTS last_city TEXT,
  ADD COLUMN IF NOT EXISTS last_region TEXT,
  ADD COLUMN IF NOT EXISTS last_country TEXT,
  ADD COLUMN IF NOT EXISTS last_isp TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
