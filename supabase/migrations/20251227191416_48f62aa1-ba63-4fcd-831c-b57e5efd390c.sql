-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create pets table
CREATE TABLE public.pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  breed TEXT,
  birth_date DATE,
  weight DECIMAL(5,2),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pets" ON public.pets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pets" ON public.pets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pets" ON public.pets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pets" ON public.pets
  FOR DELETE USING (auth.uid() = user_id);

-- Create medical_records table
CREATE TABLE public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('medical_test', 'prescription', 'passport')),
  image_path TEXT NOT NULL,
  title TEXT,
  notes TEXT,
  record_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their pets medical records" ON public.medical_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.pets WHERE pets.id = medical_records.pet_id AND pets.user_id = auth.uid())
  );

CREATE POLICY "Users can create medical records for their pets" ON public.medical_records
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.pets WHERE pets.id = medical_records.pet_id AND pets.user_id = auth.uid())
  );

CREATE POLICY "Users can update their pets medical records" ON public.medical_records
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.pets WHERE pets.id = medical_records.pet_id AND pets.user_id = auth.uid())
  );

CREATE POLICY "Users can delete their pets medical records" ON public.medical_records
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.pets WHERE pets.id = medical_records.pet_id AND pets.user_id = auth.uid())
  );

-- Create reminders table
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('vaccination', 'antiparasitic', 'checkup')),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their pets reminders" ON public.reminders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.pets WHERE pets.id = reminders.pet_id AND pets.user_id = auth.uid())
  );

CREATE POLICY "Users can create reminders for their pets" ON public.reminders
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.pets WHERE pets.id = reminders.pet_id AND pets.user_id = auth.uid())
  );

CREATE POLICY "Users can update their pets reminders" ON public.reminders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.pets WHERE pets.id = reminders.pet_id AND pets.user_id = auth.uid())
  );

CREATE POLICY "Users can delete their pets reminders" ON public.reminders
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.pets WHERE pets.id = reminders.pet_id AND pets.user_id = auth.uid())
  );

-- Create chat_messages table for AI conversation history
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  pet_context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat messages" ON public.chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for pet images
INSERT INTO storage.buckets (id, name, public) VALUES ('pet-images', 'pet-images', true);

-- Create storage bucket for medical records
INSERT INTO storage.buckets (id, name, public) VALUES ('medical-records', 'medical-records', false);

-- Storage policies for pet-images (public bucket)
CREATE POLICY "Anyone can view pet images" ON storage.objects
  FOR SELECT USING (bucket_id = 'pet-images');

CREATE POLICY "Authenticated users can upload pet images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'pet-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own pet images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'pet-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own pet images" ON storage.objects
  FOR DELETE USING (bucket_id = 'pet-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for medical-records (private bucket)
CREATE POLICY "Users can view their own medical records" ON storage.objects
  FOR SELECT USING (bucket_id = 'medical-records' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own medical records" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'medical-records' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own medical records" ON storage.objects
  FOR DELETE USING (bucket_id = 'medical-records' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pets_updated_at
  BEFORE UPDATE ON public.pets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();