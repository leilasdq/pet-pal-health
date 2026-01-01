-- Add admin UPDATE policies to all tables

-- Profiles: Admins can update all profiles
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Pets: Admins can update all pets
CREATE POLICY "Admins can update pets"
ON public.pets
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Reminders: Admins can update all reminders
CREATE POLICY "Admins can update reminders"
ON public.reminders
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Medical Records: Admins can update all medical records
CREATE POLICY "Admins can update medical records"
ON public.medical_records
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Conversations: Admins can update all conversations
CREATE POLICY "Admins can update conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Chat Messages: Admins can update all chat messages
CREATE POLICY "Admins can update chat messages"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- AI Usage: Admins can update all AI usage
CREATE POLICY "Admins can update ai_usage"
ON public.ai_usage
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Payments: Admins can update all payments
CREATE POLICY "Admins can update payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- User Subscriptions: Admins can update all subscriptions
CREATE POLICY "Admins can update subscriptions"
ON public.user_subscriptions
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Promo Code Usage: Admins can update all promo usage
CREATE POLICY "Admins can update promo_code_usage"
ON public.promo_code_usage
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Admin Invites: Admins can update invites
CREATE POLICY "Admins can update invites"
ON public.admin_invites
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));