CREATE TABLE public.admin_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  message text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_broadcasts TO authenticated;
GRANT ALL ON public.admin_broadcasts TO service_role;
ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins create broadcasts" ON public.admin_broadcasts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());
CREATE POLICY "Players read broadcasts" ON public.admin_broadcasts FOR SELECT TO authenticated USING (true);
CREATE INDEX admin_broadcasts_created_idx ON public.admin_broadcasts (created_at DESC);