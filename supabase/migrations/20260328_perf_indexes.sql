-- Performance indexes for hot API read paths
-- Safe to apply multiple times due IF NOT EXISTS.

create index if not exists idx_users_couple_id
  on public.users(couple_id);

create index if not exists idx_couples_user_1_id
  on public.couples(user_1_id);

create index if not exists idx_couples_user_2_id
  on public.couples(user_2_id);

create index if not exists idx_moods_couple_date_user
  on public.moods(couple_id, mood_date, user_id);

create index if not exists idx_favorites_user_created_at
  on public.favorites(user_id, created_at desc);

create index if not exists idx_weekly_checkins_couple_status_week
  on public.weekly_checkins(couple_id, status, week_start_date);
