-- Add duration_months column to promo_codes table
ALTER TABLE public.promo_codes 
ADD COLUMN duration_months integer NOT NULL DEFAULT 1;

-- Update the existing 3MONTH2026 promo code to grant 3 months
UPDATE public.promo_codes 
SET duration_months = 3, max_uses = 1 
WHERE code = '3MONTH2026';