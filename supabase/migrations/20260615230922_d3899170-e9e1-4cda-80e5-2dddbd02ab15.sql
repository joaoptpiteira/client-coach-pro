ALTER TABLE public.wc26_stickers DROP CONSTRAINT wc26_stickers_user_id_number_key;

ALTER TABLE public.wc26_stickers ADD COLUMN IF NOT EXISTS new_number INTEGER;

UPDATE public.wc26_stickers
SET new_number = CASE
  WHEN number <= 20 THEN number
  ELSE 20 + ((number - 21) / 22) * 20 + ((number - 21) % 22 + 1)
END;

DELETE FROM public.wc26_stickers
WHERE number > 20 AND (number - 21) % 22 + 1 > 20;

UPDATE public.wc26_stickers SET number = new_number;

ALTER TABLE public.wc26_stickers DROP COLUMN new_number;

ALTER TABLE public.wc26_stickers ADD CONSTRAINT wc26_stickers_user_id_number_key UNIQUE (user_id, number);