# Ours

A quiet space for two hearts across distance.

Seven questions every day. Two people choosing each other. A love letter that writes itself, one answer at a time.

## What it does

Every day at midnight (in your timezone), **Ours** presents you and your partner with 7 meaningful questions:

- 2 deep/vulnerable
- 1 romantic
- 1 playful
- 1 future-oriented
- 1 memory-based
- 1 wildcard (poetic or surprising)

Each of you answers privately. Until both answer, responses stay hidden with the message: *"Your words are waiting for your love."* When both submit, answers are revealed together with a gentle animation.

## Features

- **Daily Ritual** — 7 curated questions each day with no repetition for 60 days
- **Answer Reveal** — Private until both submit, then revealed together
- **Memory Book** — Timeline archive of past answers, searchable and filterable
- **Favorites** — Heart any question/answer pair to save it
- **On This Day** — Resurfaces answers from the same date in past years
- **Mood Selector** — Daily emoji mood + optional reflection
- **Streak Counter** — Tracks consecutive days of mutual participation
- **Magic Link Auth** — Passwordless, secure login
- **Couple Space** — Private invite-only pairing with a 12-character code
- **Mobile-First** — Designed to feel intimate on a phone screen

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router), React 19 |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Backend/Auth | Supabase (Postgres + Auth + RLS) |
| Deployment | Vercel |

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/facundocarrizo99/Mimi-s-app.git
cd Mimi-s-app
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Enable **Email (Magic Link)** under Authentication > Providers
4. Under Authentication > URL Configuration, add your site URL and redirect URLs:
   - Site URL: `http://localhost:3000` (dev) or your production URL
   - Redirect URLs: `http://localhost:3000/auth/callback`, `https://yourdomain.com/auth/callback`

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=any-random-secret-string
```

### 4. Seed questions

```bash
npm run seed
```

This inserts 315 meaningful questions across 6 categories into your database.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

1. Push your repo to GitHub
2. Import the project in [vercel.com](https://vercel.com)
3. Add environment variables in Vercel's project settings (same as `.env.local`)
4. Deploy — Vercel auto-detects Next.js
5. Update Supabase redirect URLs to include your production domain
6. The `vercel.json` cron runs `/api/cron` hourly to manage streak resets

## Database Schema

```
users          — id, email, display_name, couple_id, timezone
couples        — id, user_1_id, user_2_id, invite_code, timezone, streak_count
questions      — id, text, category (deep/romantic/playful/future/memory/wildcard)
daily_questions — id, couple_id, question_id, question_date, position (1-7)
answers        — id, daily_question_id, user_id, text
moods          — id, user_id, couple_id, mood_date, emoji, reflection
favorites      — id, user_id, daily_question_id
future_capsules — id, couple_id, user_id, message, open_date, is_opened
```

All tables use Row Level Security (RLS) so each user can only access their own couple's data.

## Design System

- **Colors**: Warm pastels — blush (`#f8e8e0`), lavender (`#e8daf0`), dusk blue (`#c8d8f0`), rose (`#e8a0a0`)
- **Typography**: Georgia serif for emotional text, system sans-serif for UI
- **Cards**: Rounded corners (`2xl`), glass-morphism (`bg-white/70 backdrop-blur`)
- **Animations**: Slow fades, gentle scale transitions, heart pulse on reveal
- **Spacing**: Generous padding, breathing room between elements

## Project Structure

```
src/
  app/
    page.tsx              — Landing page
    layout.tsx            — Root layout
    globals.css           — Tailwind + custom theme
    auth/
      login/page.tsx      — Magic link login
      callback/route.ts   — Auth callback
    daily/page.tsx        — Daily questions (main experience)
    memory/page.tsx       — Memory Book archive
    settings/page.tsx     — Profile & couple settings
    api/
      couple/route.ts     — Create/join couple
      daily-questions/    — Generate & fetch daily questions
        route.ts
        answer/route.ts   — Submit answers
        favorite/route.ts — Toggle favorites
      memory/route.ts     — Memory Book data
      mood/route.ts       — Mood tracking
      cron/route.ts       — Streak maintenance
  components/
    ui/                   — Button, Card, Loading, HeartPulse
    daily/                — QuestionCard, MoodSelector
    layout/               — AppShell (header + nav)
  lib/
    supabase/             — Client, server, middleware helpers
    utils.ts              — Date formatting, streak messages
    questions.ts          — Category labels, daily structure
  types/
    database.ts           — TypeScript interfaces
supabase/
  schema.sql              — Full database schema with RLS
  seed-questions.ts       — 315 seed questions
```
