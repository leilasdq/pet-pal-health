-- Add columns to store AI analysis results
ALTER TABLE public.medical_records 
ADD COLUMN ai_analysis TEXT,
ADD COLUMN ai_analyzed_at TIMESTAMP WITH TIME ZONE;