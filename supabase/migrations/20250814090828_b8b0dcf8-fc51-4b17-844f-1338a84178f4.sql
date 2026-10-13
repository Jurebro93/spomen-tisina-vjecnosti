-- Create storage bucket for obituary photos
INSERT INTO storage.buckets (id, name, public) VALUES ('obituary-photos', 'obituary-photos', true);

-- Create RLS policies for obituary photos
CREATE POLICY "Anyone can view obituary photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'obituary-photos');

CREATE POLICY "Anyone can upload obituary photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'obituary-photos');

CREATE POLICY "Service role can manage obituary photos" 
ON storage.objects 
FOR ALL 
TO service_role
USING (bucket_id = 'obituary-photos');