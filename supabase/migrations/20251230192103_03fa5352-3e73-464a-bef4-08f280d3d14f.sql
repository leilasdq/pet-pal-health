-- Add recurrence_interval column for flexible recurring (e.g., every 2 weeks, every 3 months)
ALTER TABLE public.reminders 
ADD COLUMN recurrence_interval integer DEFAULT 1;

-- Update recurrence column to only store the unit (none, week, month, year)
-- Rename values for clarity
UPDATE public.reminders SET recurrence = 'week' WHERE recurrence = 'weekly';
UPDATE public.reminders SET recurrence = 'month' WHERE recurrence = 'monthly';
UPDATE public.reminders SET recurrence = 'year' WHERE recurrence = 'yearly';

COMMENT ON COLUMN public.reminders.recurrence_interval IS 'Number of units between recurrences (e.g., 2 for every 2 weeks)';
COMMENT ON COLUMN public.reminders.recurrence IS 'Recurrence unit: none, week, month, year';