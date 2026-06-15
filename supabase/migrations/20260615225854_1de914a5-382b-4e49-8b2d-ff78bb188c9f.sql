WITH teams AS (
  SELECT
    user_id,
    section,
    team,
    min(number) AS first_number,
    row_number() OVER (PARTITION BY user_id ORDER BY min(number)) AS team_index
  FROM public.wc26_stickers
  WHERE team IS NOT NULL
  GROUP BY user_id, section, team
), ranked AS (
  SELECT
    s.id,
    20 + ((t.team_index - 1) * 22) + row_number() OVER (PARTITION BY s.user_id, s.team ORDER BY s.number) AS final_number
  FROM public.wc26_stickers s
  JOIN teams t ON t.user_id = s.user_id AND t.team = s.team
  WHERE s.team IS NOT NULL
)
UPDATE public.wc26_stickers s
SET number = ranked.final_number + 100000
FROM ranked
WHERE s.id = ranked.id;

UPDATE public.wc26_stickers
SET number = number - 100000
WHERE team IS NOT NULL AND number >= 100000;

WITH teams AS (
  SELECT
    user_id,
    section,
    team,
    min(number) AS first_number,
    row_number() OVER (PARTITION BY user_id ORDER BY min(number)) AS team_index,
    COALESCE(
      (array_agg(substring(label FROM '^(.+) [0-9]+$') ORDER BY number DESC) FILTER (WHERE label ~ '^.+ [0-9]+$'))[1],
      split_part(team, ' — ', 1)
    ) AS code
  FROM public.wc26_stickers
  WHERE team IS NOT NULL
  GROUP BY user_id, section, team
), missing_slots(slot, player_no) AS (
  VALUES (21, 19), (22, 20)
)
INSERT INTO public.wc26_stickers (user_id, number, section, team, label, is_special, owned)
SELECT
  t.user_id,
  20 + ((t.team_index - 1) * 22) + ms.slot,
  t.section,
  t.team,
  t.code || ' ' || ms.player_no,
  false,
  0
FROM teams t
CROSS JOIN missing_slots ms
WHERE NOT EXISTS (
  SELECT 1
  FROM public.wc26_stickers existing
  WHERE existing.user_id = t.user_id
    AND existing.team = t.team
    AND existing.label = t.code || ' ' || ms.player_no
)
ON CONFLICT (user_id, number) DO NOTHING;