# Rivalry Showdown

This version is upgraded to use a shared database so other users can see the same polls and vote counts.

## What you need to do

1. Create a free Supabase project at https://supabase.com
2. Open your project SQL editor
3. Run this SQL:

```sql
create extension if not exists pgcrypto;

create table if not exists polls (
  id text primary key,
  category text not null,
  option_a text not null,
  option_b text not null,
  votes_a integer not null default 0,
  votes_b integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id text not null references polls(id) on delete cascade,
  voter_key text not null,
  choice text not null check (choice in ('A', 'B')),
  created_at timestamptz not null default now(),
  unique (poll_id, voter_key)
);

alter table polls enable row level security;
alter table poll_votes enable row level security;

create policy "Public can read polls" on polls for select using (true);
create policy "Public can insert polls" on polls for insert with check (true);
create policy "Public can update polls" on polls for update using (true) with check (true);

create policy "Public can read votes" on poll_votes for select using (true);
create policy "Public can insert votes" on poll_votes for insert with check (true);
```

4. In `config.js`, replace the placeholder values with your Supabase URL and anon key.
5. Upload the repo to GitHub Pages or another static host.

## Notes

- The app now uses a shared database, so all users can see the same results.
- Each browser keeps a local voter key so users only vote once per poll.
- GitHub Pages can host the frontend; Supabase stores the real data.

## Live URL

After hosting, your site will be available as a GitHub Pages site, like:

https://YOUR_USERNAME.github.io/ultimate-rivalry-showdown
