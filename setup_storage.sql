-- Create the storage bucket 'vve-documents'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vve-documents', 'vve-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload files
CREATE POLICY "Ensures authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vve-documents');

-- Policy to allow authenticated users to view documents
CREATE POLICY "Ensures authenticated users can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'vve-documents');

-- Policy to allow users to delete their own documents (or admin logic later)
CREATE POLICY "Ensures authenticated users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vve-documents'); 
