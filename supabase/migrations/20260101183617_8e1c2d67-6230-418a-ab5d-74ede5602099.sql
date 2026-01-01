-- Remove public access to promo_codes - validation is done via edge function with service role
DROP POLICY IF EXISTS "Anyone can view active promo codes" ON public.promo_codes;

-- Add policy for authenticated users to validate codes they enter (more restrictive)
-- Users don't need to browse codes, only the edge function validates them
CREATE POLICY "Authenticated users cannot directly read promo codes" 
ON public.promo_codes 
FOR SELECT 
USING (false);

-- Note: The validate-promo-code edge function uses service role key so it bypasses RLS