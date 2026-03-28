-- Weekly check-ins migration
-- Fixes missing relation/function in PostgREST schema cache.

create table if not exists public.weekly_checkins (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  week_start_date date not null,
  question_text text not null,
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now(),
  unique (couple_id, week_start_date)
);

alter table public.weekly_checkins enable row level security;

drop policy if exists "Couple members can read their weekly check-ins" on public.weekly_checkins;
create policy "Couple members can read their weekly check-ins"
  on public.weekly_checkins for select
  using (
    couple_id in (
      select c.id from public.couples c
      where c.user_1_id = auth.uid() or c.user_2_id = auth.uid()
    )
  );

drop policy if exists "Couple members can update their weekly check-ins" on public.weekly_checkins;
create policy "Couple members can update their weekly check-ins"
  on public.weekly_checkins for update
  using (
    couple_id in (
      select c.id from public.couples c
      where c.user_1_id = auth.uid() or c.user_2_id = auth.uid()
    )
  );

create table if not exists public.weekly_checkin_answers (
  id uuid primary key default uuid_generate_v4(),
  checkin_id uuid not null references public.weekly_checkins(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  answer_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checkin_id, user_id)
);

alter table public.weekly_checkin_answers enable row level security;

drop policy if exists "Users can insert own weekly check-in answers" on public.weekly_checkin_answers;
create policy "Users can insert own weekly check-in answers"
  on public.weekly_checkin_answers for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own weekly check-in answers" on public.weekly_checkin_answers;
create policy "Users can update own weekly check-in answers"
  on public.weekly_checkin_answers for update
  using (auth.uid() = user_id);

drop policy if exists "Couple members can read weekly check-in answers" on public.weekly_checkin_answers;
create policy "Couple members can read weekly check-in answers"
  on public.weekly_checkin_answers for select
  using (
    checkin_id in (
      select wc.id from public.weekly_checkins wc
      join public.couples c on c.id = wc.couple_id
      where c.user_1_id = auth.uid() or c.user_2_id = auth.uid()
    )
  );

create index if not exists idx_weekly_checkins_couple_date
  on public.weekly_checkins(couple_id, week_start_date);

create index if not exists idx_weekly_checkin_answers_checkin
  on public.weekly_checkin_answers(checkin_id);

create or replace function public.create_or_get_weekly_checkin(
  p_couple_id uuid,
  p_week_start_date date,
  p_question_text text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_checkin_id uuid;
begin
  if not exists (
    select 1 from public.couples
    where id = p_couple_id
      and (user_1_id = auth.uid() or user_2_id = auth.uid())
  ) then
    raise exception 'Not authorized for this couple';
  end if;

  select id into v_checkin_id
  from public.weekly_checkins
  where couple_id = p_couple_id
    and week_start_date = p_week_start_date;

  if v_checkin_id is not null then
    return v_checkin_id;
  end if;

  insert into public.weekly_checkins (couple_id, week_start_date, question_text, status)
  values (p_couple_id, p_week_start_date, p_question_text, 'active')
  returning id into v_checkin_id;

  return v_checkin_id;
exception
  when unique_violation then
    select id into v_checkin_id
    from public.weekly_checkins
    where couple_id = p_couple_id
      and week_start_date = p_week_start_date;

    return v_checkin_id;
end;
$$;

grant execute on function public.create_or_get_weekly_checkin(uuid, date, text) to authenticated;

-- Refresh PostgREST schema cache.
notify pgrst, 'reload schema';
