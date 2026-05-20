-- App versions per product
CREATE TABLE public.app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL DEFAULT '1.0.0',
  file_url TEXT,
  file_path TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view versions" ON public.app_versions
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert versions" ON public.app_versions
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update versions" ON public.app_versions
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete versions" ON public.app_versions
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Storage bucket for release files
INSERT INTO storage.buckets (id, name, public) VALUES ('releases', 'releases', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read releases" ON storage.objects
  FOR SELECT USING (bucket_id = 'releases');
CREATE POLICY "Admins can upload releases" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'releases' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update releases" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'releases' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete releases" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'releases' AND has_role(auth.uid(), 'admin'));
