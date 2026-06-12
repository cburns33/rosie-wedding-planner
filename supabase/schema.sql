-- Run this in your Supabase SQL editor to set up the Rosie database

-- ---------------------------------------------------------------------------
-- Migration block (run on existing projects too): Zola integration snapshots.
-- Stores normalized, aggregate-only snapshots pulled from the Zola mobile API
-- (or CSV fallback). No guest names/addresses live here — aggregates only.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS zola_snapshots (
  id            bigserial PRIMARY KEY,
  imported_at   timestamptz NOT NULL DEFAULT now(),
  source        text NOT NULL,  -- 'api_sync' | 'csv_rsvp' | 'csv_guests'
  data          jsonb NOT NULL,
  raw_file_hash text
);
CREATE INDEX IF NOT EXISTS zola_snapshots_imported_at_idx
  ON zola_snapshots (imported_at DESC);
ALTER TABLE zola_snapshots DISABLE ROW LEVEL SECURITY;

-- Conversation history
CREATE TABLE IF NOT EXISTS messages (
  id bigserial PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Per-conversation scope. NULL = the main "Ask Rosie" thread.
-- A vendor key (e.g. 'caterer') scopes the message to that vendor's focus.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_key text;
CREATE INDEX IF NOT EXISTS messages_thread_key_idx
  ON messages (thread_key, created_at);

-- Internal per-vendor running memory (Rosie-maintained, never shown to Kelsie).
CREATE TABLE IF NOT EXISTS vendor_memory (
  vendor text PRIMARY KEY,
  markdown text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE vendor_memory DISABLE ROW LEVEL SECURITY;

-- Wedding planning state (single row, id always = 1)
CREATE TABLE IF NOT EXISTS wedding_state (
  id int PRIMARY KEY DEFAULT 1,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Seed the default wedding state
INSERT INTO wedding_state (id, data)
VALUES (1, '{
  "budget": {
    "total": 75000,
    "allocations": {},
    "notes": []
  },
  "timeline": {
    "targetDate": "spring 2027",
    "confirmedDate": null,
    "ceremonyTime": null
  },
  "venue": {
    "status": "undecided",
    "shortlist": [],
    "selected": null
  },
  "guests": {
    "estimated": "250–300",
    "finalCount": null
  },
  "vendors": {
    "photographer": {"status": "undecided", "name": null, "notes": null, "cost": null},
    "videographer": {"status": "undecided", "name": null, "notes": null, "cost": null},
    "caterer": {"status": "undecided", "name": null, "notes": null, "cost": null},
    "florist": {"status": "undecided", "name": null, "notes": null, "cost": null},
    "dj": {"status": "undecided", "name": null, "notes": null, "cost": null},
    "officiant": {"status": "undecided", "name": null, "notes": null, "cost": null},
    "cake": {"status": "undecided", "name": null, "notes": null, "cost": null},
    "hair_makeup": {"status": "undecided", "name": null, "notes": null, "cost": null},
    "transportation": {"status": "undecided", "name": null, "notes": null, "cost": null}
  },
  "decisions": [],
  "aesthetic": {
    "palette": ["pink", "green", "blue"],
    "style": "elevated classic",
    "music": "DJ with potential live instrument",
    "notes": []
  },
  "location": {
    "region": "southeast/central Texas",
    "hub": "Houston",
    "decided": false,
    "notes": null
  }
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Optional: disable RLS since this is a single-user app
-- (If you prefer RLS, set up policies appropriate to your auth setup)
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_state DISABLE ROW LEVEL SECURITY;
