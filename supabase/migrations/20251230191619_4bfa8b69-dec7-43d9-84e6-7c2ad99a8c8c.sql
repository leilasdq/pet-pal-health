-- Add recurrence column to reminders table
ALTER TABLE public.reminders 
ADD COLUMN recurrence text NOT NULL DEFAULT 'none';

-- Add comment for documentation
COMMENT ON COLUMN public.reminders.recurrence IS 'Recurrence pattern: none, weekly, monthly, yearly';