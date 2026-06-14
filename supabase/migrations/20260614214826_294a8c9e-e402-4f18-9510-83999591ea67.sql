
CREATE TABLE public.wc26_stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  number integer NOT NULL,
  section text NOT NULL,
  team text,
  label text NOT NULL,
  is_special boolean NOT NULL DEFAULT false,
  owned integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wc26_stickers TO authenticated;
GRANT ALL ON public.wc26_stickers TO service_role;

ALTER TABLE public.wc26_stickers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own wc26 stickers"
  ON public.wc26_stickers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX wc26_stickers_user_section_idx ON public.wc26_stickers (user_id, section);
CREATE INDEX wc26_stickers_user_team_idx ON public.wc26_stickers (user_id, team);

CREATE TRIGGER wc26_stickers_set_updated_at
  BEFORE UPDATE ON public.wc26_stickers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
