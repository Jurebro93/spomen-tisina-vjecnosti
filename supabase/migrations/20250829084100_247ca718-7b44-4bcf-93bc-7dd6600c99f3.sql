-- Create storage bucket for sitemaps
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sitemaps', 'sitemaps', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for sitemap bucket
CREATE POLICY "Public sitemap access" ON storage.objects
FOR SELECT USING (bucket_id = 'sitemaps');

CREATE POLICY "Service role can manage sitemaps" ON storage.objects
FOR ALL USING (bucket_id = 'sitemaps');