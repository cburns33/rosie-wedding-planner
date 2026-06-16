# Rosie — Wedding Planner Agent

Personalized wedding planning AI for Kelsie Burns (spring 2027). Built by Chase Burns.

## Docs

| Doc | Purpose |
|-----|---------|
| [`PROJECT.md`](./PROJECT.md) | Architecture, routes, database, design system, known issues |
| [`SETUP.md`](./SETUP.md) | Supabase, env vars, Vercel, first-time setup |
| [`qa/README.md`](./qa/README.md) | Local QA walkthroughs and reset scripts |
| [`qa/intro-review.md`](./qa/intro-review.md) | Intro/aesthetic QA checklist and issue log |

## Quick start

```bash
cp .env.local.example .env.local   # fill in values
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Local UI work can use `DISABLE_AUTH=true` in `.env.local` (never on Vercel).

```bash
npm test        # Vitest unit tests
```

Production: [rosie-wedding-planner.vercel.app](https://rosie-wedding-planner.vercel.app)
