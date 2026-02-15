-- Add discord_id column to profiles table
ALTER TABLE public.profiles ADD COLUMN discord_id TEXT;
CREATE INDEX idx_profiles_discord_id ON public.profiles(discord_id);
