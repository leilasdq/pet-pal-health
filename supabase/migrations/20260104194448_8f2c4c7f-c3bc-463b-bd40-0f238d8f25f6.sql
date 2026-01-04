-- Add new columns to pets table for extended pet information
ALTER TABLE public.pets
ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female')),
ADD COLUMN is_neutered BOOLEAN DEFAULT false,
ADD COLUMN activity_level TEXT CHECK (activity_level IN ('low', 'moderate', 'high')),
ADD COLUMN allergies TEXT;