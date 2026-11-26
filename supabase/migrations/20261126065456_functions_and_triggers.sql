-- New users get a profile with a unique handle ------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
  candidate text;
begin
  base := lower(regexp_replace(coalesce(split_part(new.email, '@', 1), 'user'), '[^a-z0-9_]', '', 'gi'));
  base := left(nullif(base, ''), 14);
  if base is null or length(base) < 3 then base := 'user'; end if;
  candidate := base;
  while exists (select 1 from public.profiles where handle = candidate) loop
    candidate := base || '_' || substr(md5(random()::text), 1, 4);
  end loop;
  insert into public.profiles (id, handle, display_name, avatar_url)
  values (new.id, candidate,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
          new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Re-rank history + list timestamps -----------------------------------------
create or replace function public.log_placement_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.placement_history (list_id, item_id, old_tier, new_tier)
    values (new.list_id, new.item_id, null, new.tier_index);
    update public.lists set updated_at = now() where id = new.list_id;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.tier_index is distinct from old.tier_index then
      insert into public.placement_history (list_id, item_id, old_tier, new_tier)
      values (new.list_id, new.item_id, old.tier_index, new.tier_index);
      update public.lists set updated_at = now() where id = new.list_id;
    end if;
    return new;
  else
    insert into public.placement_history (list_id, item_id, old_tier, new_tier)
    values (old.list_id, old.item_id, old.tier_index, null);
    update public.lists set updated_at = now() where id = old.list_id;
    return old;
  end if;
end;
$$;

create trigger placements_history
  after insert or update or delete on public.placements
  for each row execute function public.log_placement_change();

-- Larp Check: start -----------------------------------------------------------
create or replace function public.start_larp_check(p_item_slug text)
returns table (attempt_id uuid, question_id uuid, prompt text, options text[], seconds_per_question int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_item uuid;
  v_qids uuid[];
  v_attempt uuid;
  v_last_fail timestamptz;
begin
  if v_user is null then raise exception 'Sign in to take a Larp Check'; end if;

  select id into v_item from public.items where slug = p_item_slug;
  if v_item is null then raise exception 'Unknown item'; end if;

  if exists (select 1 from public.certifications where user_id = v_user and item_id = v_item) then
    raise exception 'Already certified';
  end if;

  select max(started_at) into v_last_fail from public.larp_attempts
   where user_id = v_user and item_id = v_item and passed = false;
  if v_last_fail is not null and v_last_fail > now() - interval '24 hours' then
    raise exception 'Cooldown until %', v_last_fail + interval '24 hours';
  end if;

  select array_agg(q.id) into v_qids from (
    select id from public.quiz_questions where item_id = v_item order by random() limit 5
  ) q;
  if v_qids is null then raise exception 'No Larp Check for this item yet'; end if;

  insert into public.larp_attempts (user_id, item_id, question_ids)
  values (v_user, v_item, v_qids) returning id into v_attempt;

  return query
    select v_attempt, q.id, q.prompt, q.options, 20
      from unnest(v_qids) with ordinality as u(qid, ord)
      join public.quiz_questions q on q.id = u.qid
     order by u.ord;
end;
$$;

-- Larp Check: submit ---------------------------------------------------------
create or replace function public.submit_larp_check(p_attempt_id uuid, p_answers smallint[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  a public.larp_attempts%rowtype;
  v_total int;
  v_score int := 0;
  v_pass_mark int;
  v_passed boolean;
  v_retake boolean;
  v_late boolean;
begin
  select * into a from public.larp_attempts where id = p_attempt_id for update;
  if a.id is null or a.user_id is distinct from v_user then raise exception 'Attempt not found'; end if;
  if a.finished_at is not null then raise exception 'Attempt already submitted'; end if;

  v_total := array_length(a.question_ids, 1);
  -- 20 seconds per question plus 15 seconds of grace for network lag.
  v_late := now() > a.started_at + make_interval(secs => v_total * 20 + 15);

  if not v_late then
    select count(*) into v_score
      from unnest(a.question_ids) with ordinality as u(qid, ord)
      join public.quiz_answers ans on ans.question_id = u.qid
     where p_answers[u.ord] = ans.answer_index;
  end if;

  v_pass_mark := least(4, v_total);
  v_passed := v_score >= v_pass_mark;

  update public.larp_attempts
     set finished_at = now(), score = v_score, passed = v_passed
   where id = a.id;

  if v_passed then
    v_retake := exists (select 1 from public.larp_attempts
                         where user_id = v_user and item_id = a.item_id and passed = false);
    insert into public.certifications (user_id, item_id, via_retake)
    values (v_user, a.item_id, v_retake)
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'score', v_score,
    'total', v_total,
    'passed', v_passed,
    'timed_out', v_late,
    'cooldown_until', case when v_passed then null else now() + interval '24 hours' end
  );
end;
$$;

revoke all on function public.start_larp_check(text) from public, anon;
revoke all on function public.submit_larp_check(uuid, smallint[]) from public, anon;
grant execute on function public.start_larp_check(text) to authenticated;
grant execute on function public.submit_larp_check(uuid, smallint[]) to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.log_placement_change() from public, anon, authenticated;

-- Community ranking: certified placements count double ------------------------
create view public.template_community
with (security_invoker = true) as
select
  l.template_id,
  p.item_id,
  count(*)::int as takes,
  count(c.item_id)::int as certified_takes,
  round(sum(p.tier_index * case when c.item_id is not null then 2 else 1 end)::numeric
        / sum(case when c.item_id is not null then 2 else 1 end), 2) as weighted_tier,
  round(coalesce(stddev_pop(p.tier_index), 0)::numeric, 2) as spread
from public.placements p
join public.lists l on l.id = p.list_id and l.visibility = 'public'
left join public.certifications c on c.user_id = l.user_id and c.item_id = p.item_id
group by l.template_id, p.item_id;
