-- ============================================================
-- "Ours" — Database Schema
-- A private space for two hearts across distance.
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text not null default '',
  couple_id uuid,
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can read partner profile"
  on public.users for select
  using (
    couple_id is not null
    and couple_id in (
      select couple_id from public.users where id = auth.uid()
    )
  );

-- ============================================================
-- COUPLES
-- ============================================================
create table public.couples (
  id uuid primary key default uuid_generate_v4(),
  user_1_id uuid not null references public.users(id) on delete cascade,
  user_2_id uuid references public.users(id) on delete set null,
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  timezone text not null default 'America/New_York',
  streak_count int not null default 0,
  last_streak_date date,
  created_at timestamptz not null default now()
);

alter table public.couples enable row level security;

create policy "Couple members can read their couple"
  on public.couples for select
  using (
    auth.uid() = user_1_id or auth.uid() = user_2_id
  );

create policy "Couple members can update their couple"
  on public.couples for update
  using (
    auth.uid() = user_1_id or auth.uid() = user_2_id
  );

-- Allow authenticated users to create couples
create policy "Authenticated users can create couples"
  on public.couples for insert
  with check (auth.uid() = user_1_id);

-- ============================================================
-- QUESTIONS
-- ============================================================
create type question_category as enum (
  'deep', 'romantic', 'playful', 'future', 'memory', 'wildcard'
);

create table public.questions (
  id uuid primary key default uuid_generate_v4(),
  text text not null,
  category question_category not null,
  created_at timestamptz not null default now()
);

alter table public.questions enable row level security;

create policy "Authenticated users can read questions"
  on public.questions for select
  to authenticated
  using (true);

-- ============================================================
-- DAILY QUESTIONS
-- ============================================================
create table public.daily_questions (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  question_date date not null,
  position int not null check (position between 1 and 7),
  created_at timestamptz not null default now(),
  unique (couple_id, question_date, position)
);

alter table public.daily_questions enable row level security;

create policy "Couple members can read their daily questions"
  on public.daily_questions for select
  using (
    couple_id in (
      select c.id from public.couples c
      where c.user_1_id = auth.uid() or c.user_2_id = auth.uid()
    )
  );

-- ============================================================
-- ANSWERS
-- ============================================================
create table public.answers (
  id uuid primary key default uuid_generate_v4(),
  daily_question_id uuid not null references public.daily_questions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (daily_question_id, user_id)
);

alter table public.answers enable row level security;

create policy "Users can insert own answers"
  on public.answers for insert
  with check (auth.uid() = user_id);

create policy "Users can update own answers"
  on public.answers for update
  using (auth.uid() = user_id);

create policy "Couple members can read answers for their questions"
  on public.answers for select
  using (
    daily_question_id in (
      select dq.id from public.daily_questions dq
      join public.couples c on c.id = dq.couple_id
      where c.user_1_id = auth.uid() or c.user_2_id = auth.uid()
    )
  );

-- ============================================================
-- MOODS
-- ============================================================
create table public.moods (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  mood_date date not null,
  emoji text not null,
  reflection text,
  created_at timestamptz not null default now(),
  unique (user_id, mood_date)
);

alter table public.moods enable row level security;

create policy "Users can manage own moods"
  on public.moods for all
  using (auth.uid() = user_id);

create policy "Couple members can read partner moods"
  on public.moods for select
  using (
    couple_id in (
      select c.id from public.couples c
      where c.user_1_id = auth.uid() or c.user_2_id = auth.uid()
    )
  );

-- ============================================================
-- FAVORITES
-- ============================================================
create table public.favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  daily_question_id uuid not null references public.daily_questions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, daily_question_id)
);

alter table public.favorites enable row level security;

create policy "Users can manage own favorites"
  on public.favorites for all
  using (auth.uid() = user_id);

create policy "Users can insert favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- FUTURE CAPSULES
-- ============================================================
create table public.future_capsules (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  open_date date not null,
  is_opened boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.future_capsules enable row level security;

create policy "Couple members can read opened capsules"
  on public.future_capsules for select
  using (
    couple_id in (
      select c.id from public.couples c
      where c.user_1_id = auth.uid() or c.user_2_id = auth.uid()
    )
    and (is_opened = true or user_id = auth.uid())
  );

create policy "Users can create capsules"
  on public.future_capsules for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_daily_questions_couple_date
  on public.daily_questions(couple_id, question_date);

create index idx_answers_daily_question
  on public.answers(daily_question_id);

create index idx_moods_user_date
  on public.moods(user_id, mood_date);

create index idx_favorites_user
  on public.favorites(user_id);

-- ============================================================
-- FUNCTION: Handle new user signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- FUNCTION: Update streak
-- ============================================================
create or replace function public.update_streak(p_couple_id uuid, p_date date)
returns void as $$
declare
  v_last_date date;
  v_streak int;
begin
  select last_streak_date, streak_count
  into v_last_date, v_streak
  from public.couples
  where id = p_couple_id;

  if v_last_date = p_date then
    -- Already counted today
    return;
  elsif v_last_date = p_date - interval '1 day' then
    -- Consecutive day
    update public.couples
    set streak_count = v_streak + 1, last_streak_date = p_date
    where id = p_couple_id;
  else
    -- Streak broken or first day
    update public.couples
    set streak_count = 1, last_streak_date = p_date
    where id = p_couple_id;
  end if;
end;
$$ language plpgsql security definer;

-- ============================================================
-- WEEKLY CHECK-INS
-- ============================================================
create table public.weekly_checkins (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  week_start_date date not null,
  question_text text not null,
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now(),
  unique (couple_id, week_start_date)
);

alter table public.weekly_checkins enable row level security;

create policy "Couple members can read their weekly check-ins"
  on public.weekly_checkins for select
  using (
    couple_id in (
      select c.id from public.couples c
      where c.user_1_id = auth.uid() or c.user_2_id = auth.uid()
    )
  );

-- ============================================================
-- WEEKLY CHECK-IN ANSWERS
-- ============================================================
create table public.weekly_checkin_answers (
  id uuid primary key default uuid_generate_v4(),
  checkin_id uuid not null references public.weekly_checkins(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  answer_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checkin_id, user_id)
);

alter table public.weekly_checkin_answers enable row level security;

create policy "Users can insert own weekly check-in answers"
  on public.weekly_checkin_answers for insert
  with check (auth.uid() = user_id);

create policy "Users can update own weekly check-in answers"
  on public.weekly_checkin_answers for update
  using (auth.uid() = user_id);

create policy "Couple members can read weekly check-in answers"
  on public.weekly_checkin_answers for select
  using (
    checkin_id in (
      select wc.id from public.weekly_checkins wc
      join public.couples c on c.id = wc.couple_id
      where c.user_1_id = auth.uid() or c.user_2_id = auth.uid()
    )
  );

-- ============================================================
-- INDEXES: Weekly Check-ins
-- ============================================================
create index idx_weekly_checkins_couple_date
  on public.weekly_checkins(couple_id, week_start_date);

create index idx_weekly_checkin_answers_checkin
  on public.weekly_checkin_answers(checkin_id);
