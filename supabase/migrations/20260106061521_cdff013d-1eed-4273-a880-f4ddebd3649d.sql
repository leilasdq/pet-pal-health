-- Create weight_history table to track pet weights over time
CREATE TABLE public.weight_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  weight NUMERIC NOT NULL,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_weight_history_pet_id ON public.weight_history(pet_id);
CREATE INDEX idx_weight_history_recorded_at ON public.weight_history(pet_id, recorded_at);

-- Enable RLS
ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;

-- Users can view weight history for their own pets
CREATE POLICY "Users can view their pets weight history"
ON public.weight_history
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM pets 
  WHERE pets.id = weight_history.pet_id 
  AND pets.user_id = auth.uid()
));

-- Users can insert weight history for their own pets
CREATE POLICY "Users can create weight history for their pets"
ON public.weight_history
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM pets 
  WHERE pets.id = weight_history.pet_id 
  AND pets.user_id = auth.uid()
));

-- Users can update weight history for their own pets
CREATE POLICY "Users can update their pets weight history"
ON public.weight_history
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM pets 
  WHERE pets.id = weight_history.pet_id 
  AND pets.user_id = auth.uid()
));

-- Users can delete weight history for their own pets
CREATE POLICY "Users can delete their pets weight history"
ON public.weight_history
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM pets 
  WHERE pets.id = weight_history.pet_id 
  AND pets.user_id = auth.uid()
));

-- Admins can manage all weight history
CREATE POLICY "Admins can delete weight history"
ON public.weight_history
FOR DELETE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update weight history"
ON public.weight_history
FOR UPDATE
USING (is_admin(auth.uid()));