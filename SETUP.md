# Rosie — Setup Guide

## 1. Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Grab your credentials from **Settings → API**:
   - Project URL → `SUPABASE_URL`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Anthropic API key

Get your key at [console.anthropic.com](https://console.anthropic.com) → `ANTHROPIC_API_KEY`

## 3. Local development

```bash
cp .env.local.example .env.local
# fill in the three values above
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 4. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

When prompted, add the same three environment variables. The app will deploy automatically.

After deploying, share the URL with Kelsie — that's it.

## How it works

- **Chat tab** — Rosie holds the full conversation across sessions. Every message sends the complete history to the Anthropic API.
- **Planning tab** — a read-only dashboard that updates as Rosie learns things. Rosie silently calls a tool whenever something is worth tracking (a venue shortlisted, a vendor mentioned, a budget thought, a decision made).
- The system prompt lives in `lib/system-prompt.ts`. The RTF in the root is the original source — if you update it, paste the new text into the `ROSIE_BASE_PROMPT` constant.

## Model

Currently using `claude-sonnet-4-6`. To change, update `model` in `app/api/chat/route.ts`.
