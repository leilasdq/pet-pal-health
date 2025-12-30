-- Add notification preferences to profiles table
ALTER TABLE public.profiles 
ADD COLUMN push_notifications_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN email_notifications_enabled BOOLEAN NOT NULL DEFAULT true;