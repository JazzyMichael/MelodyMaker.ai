-- Create storage bucket for music files
INSERT INTO storage.buckets (id, name, public)
VALUES ('music', 'music', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the music bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'music');

CREATE POLICY "Authenticated users can upload music" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'music' AND auth.role() = 'authenticated');

CREATE POLICY "Service role can manage music files" ON storage.objects FOR ALL 
USING (bucket_id = 'music' AND auth.jwt() ->> 'role' = 'service_role');
