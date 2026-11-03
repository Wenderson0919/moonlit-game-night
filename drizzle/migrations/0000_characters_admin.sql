CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Personagem salvo por conta
CREATE TABLE public.characters (
  user_id uuid PRIMARY KEY,
  email text,
  name text NOT NULL DEFAULT 'Herói',
  class_name text NOT NULL DEFAULT '',
  level integer NOT NULL DEFAULT 1,
  gold integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.characters TO authenticated;
GRANT ALL ON public.characters TO service_role;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own character or admin read" ON public.characters FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Insert own character" ON public.characters FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own character" ON public.characters FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Alterações e presentes enviados pela administração
CREATE TABLE public.admin_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('level','gold','resource','tool','build','gear','pet','mount')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);
CREATE INDEX admin_grants_pending_idx ON public.admin_grants (target_user_id) WHERE applied_at IS NULL;
GRANT SELECT, INSERT ON public.admin_grants TO authenticated;
GRANT UPDATE (applied_at) ON public.admin_grants TO authenticated;
GRANT ALL ON public.admin_grants TO service_role;
ALTER TABLE public.admin_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins create grants" ON public.admin_grants FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());
CREATE POLICY "Target or admin read grants" ON public.admin_grants FOR SELECT TO authenticated
  USING (target_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Target marks grant applied" ON public.admin_grants FOR UPDATE TO authenticated
  USING (target_user_id = auth.uid()) WITH CHECK (target_user_id = auth.uid());

-- Admin automático para o e-mail da dona do jogo, só depois do e-mail confirmado
CREATE OR REPLACE FUNCTION public.assign_owner_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 'muricomosca@gmail.com' AND NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_owner_admin
  AFTER INSERT OR UPDATE OF email_confirmed_at, email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_owner_admin();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users
WHERE lower(email) = 'muricomosca@gmail.com' AND email_confirmed_at IS NOT NULL
ON CONFLICT DO NOTHING;