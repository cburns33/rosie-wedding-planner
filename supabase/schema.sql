-- Run this in your Supabase SQL editor to set up the Rosie database

-- Conversation history
CREATE TABLE IF NOT EXISTS messages (
  id bigserial PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

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
