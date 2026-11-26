-- Profiles ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Catalog ----------------------------------------------------------------
create table public.items (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null,
  source text not null default 'sample',
  source_id text,
  image_url text,
  created_at timestamptz not null default now()
);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category text not null,
  source text not null default 'sample',
  is_official boolean not null default false,
  creator_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.template_items (
  template_id uuid not null references public.templates(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  sort_order int not null default 0,
  primary key (template_id, item_id)
);
create index template_items_item_idx on public.template_items(item_id);

-- Larp Check -------------------------------------------------------------
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  prompt text not null,
  options text[] not null check (array_length(options, 1) between 2 and 6),
  created_at timestamptz not null default now()
);
create index quiz_questions_item_idx on public.quiz_questions(item_id);

-- Answers live apart so clients can never read them.
create table public.quiz_answers (
  question_id uuid primary key references public.quiz_questions(id) on delete cascade,
  answer_index smallint not null
);

create table public.larp_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  question_ids uuid[] not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  score smallint,
  passed boolean
);
create index larp_attempts_user_item_idx on public.larp_attempts(user_id, item_id, started_at desc);

create table public.certifications (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  certified_at timestamptz not null default now(),
  via_retake boolean not null default false,
  primary key (user_id, item_id)
);

-- Lists and placements -----------------------------------------------------
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  template_id uuid not null references public.templates(id) on delete cascade,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, template_id)
);
create index lists_template_idx on public.lists(template_id);

create table public.placements (
  list_id uuid not null references public.lists(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  tier_index smallint not null check (tier_index between 0 and 5),
  position int not null default 0,
  primary key (list_id, item_id)
);
create index placements_item_idx on public.placements(item_id);

create table public.placement_history (
  id bigint generated always as identity primary key,
  list_id uuid not null references public.lists(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  old_tier smallint,
  new_tier smallint,
  changed_at timestamptz not null default now()
);
create index placement_history_list_idx on public.placement_history(list_id, changed_at desc);

-- Social -----------------------------------------------------------------
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows(followee_id);

-- Row level security -------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.templates enable row level security;
alter table public.template_items enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.larp_attempts enable row level security;
alter table public.certifications enable row level security;
alter table public.lists enable row level security;
alter table public.placements enable row level security;
alter table public.placement_history enable row level security;
alter table public.follows enable row level security;

create policy "profiles are public" on public.profiles for select using (true);
create policy "update own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "items are public" on public.items for select using (true);
create policy "templates are public" on public.templates for select using (true);
create policy "template items are public" on public.template_items for select using (true);
create policy "questions are public" on public.quiz_questions for select using (true);
-- quiz_answers: no policies = no client access.

create policy "read own attempts" on public.larp_attempts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "certifications are public" on public.certifications for select using (true);

create policy "read public or own lists" on public.lists for select
  using (visibility = 'public' or (select auth.uid()) = user_id);
create policy "create own lists" on public.lists for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "update own lists" on public.lists for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own lists" on public.lists for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "read placements of visible lists" on public.placements for select
  using (exists (select 1 from public.lists l where l.id = list_id
                 and (l.visibility = 'public' or l.user_id = (select auth.uid()))));
create policy "write placements on own lists" on public.placements for all to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())));

create policy "read history of visible lists" on public.placement_history for select
  using (exists (select 1 from public.lists l where l.id = list_id
                 and (l.visibility = 'public' or l.user_id = (select auth.uid()))));

create policy "follows are public" on public.follows for select using (true);
create policy "follow as yourself" on public.follows for insert to authenticated
  with check ((select auth.uid()) = follower_id);
create policy "unfollow as yourself" on public.follows for delete to authenticated
  using ((select auth.uid()) = follower_id);
