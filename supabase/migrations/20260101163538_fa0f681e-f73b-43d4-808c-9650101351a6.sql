-- Add admin SELECT policies to all tables

-- Profiles: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Pets: Admins can view all pets
CREATE POLICY "Admins can view all pets"
ON public.pets
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Reminders: Admins can view all reminders
CREATE POLICY "Admins can view all reminders"
ON public.reminders
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Medical Records: Admins can view all medical records
CREATE POLICY "Admins can view all medical records"
ON public.medical_records
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Conversations: Admins can view all conversations
CREATE POLICY "Admins can view all conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Chat Messages: Admins can view all chat messages
CREATE POLICY "Admins can view all chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- AI Usage: Admins can view all AI usage
CREATE POLICY "Admins can view all ai_usage"
ON public.ai_usage
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Payments: Admins can view all payments
CREATE POLICY "Admins can view all payments"
ON public.payments
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- User Subscriptions: Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Promo Code Usage: Admins can view all promo usage
CREATE POLICY "Admins can view all promo_code_usage"
ON public.promo_code_usage
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Admin DELETE policies for managing data

-- Profiles: Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Pets: Admins can delete pets
CREATE POLICY "Admins can delete pets"
ON public.pets
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Reminders: Admins can delete reminders
CREATE POLICY "Admins can delete reminders"
ON public.reminders
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Medical Records: Admins can delete medical records
CREATE POLICY "Admins can delete medical records"
ON public.medical_records
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Conversations: Admins can delete conversations
CREATE POLICY "Admins can delete conversations"
ON public.conversations
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Chat Messages: Admins can delete chat messages
CREATE POLICY "Admins can delete chat messages"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- AI Usage: Admins can delete AI usage
CREATE POLICY "Admins can delete ai_usage"
ON public.ai_usage
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Payments: Admins can delete payments
CREATE POLICY "Admins can delete payments"
ON public.payments
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- User Subscriptions: Admins can delete subscriptions
CREATE POLICY "Admins can delete subscriptions"
ON public.user_subscriptions
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Promo Code Usage: Admins can delete promo usage
CREATE POLICY "Admins can delete promo_code_usage"
ON public.promo_code_usage
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));