create index certifications_item_idx on public.certifications(item_id);
create index larp_attempts_item_idx on public.larp_attempts(item_id);
create index placement_history_item_idx on public.placement_history(item_id);
create index templates_creator_idx on public.templates(creator_id);

drop policy "write placements on own lists" on public.placements;
create policy "insert placements on own lists" on public.placements for insert to authenticated
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())));
create policy "update placements on own lists" on public.placements for update to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())));
create policy "delete placements on own lists" on public.placements for delete to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())));

comment on table public.quiz_answers is 'Intentionally no RLS policies: answers are only read by submit_larp_check (security definer).';
