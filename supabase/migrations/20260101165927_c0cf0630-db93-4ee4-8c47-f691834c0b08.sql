-- Add admin full access policies for promo_codes

CREATE POLICY "Admins can view all promo_codes"
ON public.promo_codes
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert promo_codes"
ON public.promo_codes
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update promo_codes"
ON public.promo_codes
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete promo_codes"
ON public.promo_codes
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Add admin full access policies for subscription_tiers

CREATE POLICY "Admins can view all subscription_tiers"
ON public.subscription_tiers
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert subscription_tiers"
ON public.subscription_tiers
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update subscription_tiers"
ON public.subscription_tiers
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete subscription_tiers"
ON public.subscription_tiers
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));