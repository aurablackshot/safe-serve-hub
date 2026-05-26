
-- Private bucket for license-gated asset files (e.g. antiwing .fx)
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', false)
ON CONFLICT (id) DO NOTHING;

-- Admin storage policies for the assets bucket
CREATE POLICY "Admins can read assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'assets' AND public.has_role(auth.uid(), 'admin'));

-- Asset registry table (keyed assets, one row per asset key)
CREATE TABLE public.assets (
  key TEXT PRIMARY KEY,
  product TEXT NOT NULL,
  file_path TEXT,
  filename TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view assets"
  ON public.assets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert assets"
  ON public.assets FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update assets"
  ON public.assets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete assets"
  ON public.assets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
