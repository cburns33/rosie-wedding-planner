-- Reset intro / aesthetic QA state (run before each intro walkthrough).
-- Also available: node scripts/reset-intro.mjs
-- Preserves budget, vendors, location, Zola integration, and non-vibe decisions.

DELETE FROM messages WHERE thread_key IS NULL;

UPDATE wedding_state
SET
  data = data
    || '{"intro_completed": false}'::jsonb
    || '{
      "aesthetic": {
        "palette": ["#c9a0a0", "#8faf8f", "#faf8f5", "#d4c4a8", "#6b6560"],
        "style": null,
        "music": "DJ with potential live instrument",
        "notes": [],
        "borrow": [],
        "avoid": [],
        "layout": [],
        "inspiration": { "moment": null, "structural": null },
        "introCompleted": false,
        "themeApplied": false
      }
    }'::jsonb,
  updated_at = now()
WHERE id = 1;

UPDATE wedding_state ws
SET data = jsonb_set(
  ws.data,
  '{decisions}',
  COALESCE(
    (
      SELECT jsonb_agg(elem)
      FROM jsonb_array_elements(COALESCE(ws.data->'decisions', '[]'::jsonb)) AS elem
      WHERE elem->>'decision' NOT LIKE 'Vibe set:%'
    ),
    '[]'::jsonb
  )
)
WHERE ws.id = 1;

-- Optional: clear vendor focus threads too
-- DELETE FROM messages WHERE thread_key IS NOT NULL;
