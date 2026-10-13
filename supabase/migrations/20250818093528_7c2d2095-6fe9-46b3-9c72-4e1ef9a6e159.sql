-- Create newsletter_users table
CREATE TABLE public.newsletter_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.newsletter_users ENABLE ROW LEVEL SECURITY;

-- Allow public to insert newsletter subscriptions
CREATE POLICY "Public can subscribe to newsletter" 
ON public.newsletter_users 
FOR INSERT 
WITH CHECK (true);

-- Block public read access
CREATE POLICY "Block public read access to newsletter_users" 
ON public.newsletter_users 
FOR SELECT 
USING (false);

-- Service role full access
CREATE POLICY "Service role full access to newsletter_users" 
ON public.newsletter_users 
FOR ALL 
USING (true) 
WITH CHECK (true);