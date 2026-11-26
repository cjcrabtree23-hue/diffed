import "server-only";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { EditorData, TemplateSummary } from "@/lib/types";

export async function getTemplates(): Promise<TemplateSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("templates")
    .select("id, slug, title, category, template_items(item_id)")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((t) => ({
    id: t.id,
    slug: t.slug,
    title: t.title,
    category: t.category,
    itemCount: Array.isArray(t.template_items) ? t.template_items.length : 0,
  }));
}

export async function getEditorData(slug: string): Promise<EditorData | null> {
  const supabase = await createClient();
  const { data: template } = await supabase
    .from("templates")
    .select("id, slug, title, category")
    .eq("slug", slug)
    .maybeSingle();
  if (!template) return null;

  const [{ data: links }, { data: community }, user] = await Promise.all([
    supabase
      .from("template_items")
      .select("sort_order, items(id, slug, name)")
      .eq("template_id", template.id)
      .order("sort_order"),
    supabase.from("template_community").select("item_id, weighted_tier, takes").eq("template_id", template.id),
    getCurrentUser(),
  ]);

  const items = (links ?? [])
    .map((l) => l.items as unknown as { id: string; slug: string; name: string } | null)
    .filter((i): i is { id: string; slug: string; name: string } => !!i);
  const itemIds = items.map((i) => i.id);

  const { data: questionRows } = await supabase.from("quiz_questions").select("item_id").in("item_id", itemIds);
  const withCheck = new Set((questionRows ?? []).map((q) => q.item_id));

  const communityMap: Record<string, number> = {};
  let communityTakes = 0;
  for (const row of community ?? []) {
    if (row.item_id && row.weighted_tier !== null) communityMap[row.item_id] = Math.round(Number(row.weighted_tier));
    communityTakes = Math.max(communityTakes, row.takes ?? 0);
  }

  let listId: string | null = null;
  let saved: EditorData["saved"] = [];
  let certified: string[] = [];
  const cooldowns: Record<string, string> = {};

  if (user) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [{ data: list }, { data: certs }, { data: fails }] = await Promise.all([
      supabase.from("lists").select("id").eq("user_id", user.id).eq("template_id", template.id).maybeSingle(),
      supabase.from("certifications").select("item_id").eq("user_id", user.id).in("item_id", itemIds),
      supabase
        .from("larp_attempts")
        .select("item_id, started_at")
        .eq("user_id", user.id)
        .eq("passed", false)
        .gte("started_at", since)
        .in("item_id", itemIds),
    ]);
    certified = (certs ?? []).map((c) => c.item_id);
    for (const f of fails ?? []) {
      const ends = new Date(new Date(f.started_at).getTime() + 24 * 60 * 60 * 1000).toISOString();
      if (!cooldowns[f.item_id] || cooldowns[f.item_id] < ends) cooldowns[f.item_id] = ends;
    }
    if (list) {
      listId = list.id;
      const { data: rows } = await supabase
        .from("placements")
        .select("item_id, tier_index, position")
        .eq("list_id", list.id)
        .order("position");
      saved = (rows ?? []).map((r) => ({ itemId: r.item_id, tier: r.tier_index, position: r.position }));
    }
  }

  return {
    template,
    items: items.map((i) => ({ id: i.id, slug: i.slug, name: i.name, hasCheck: withCheck.has(i.id) })),
    community: communityMap,
    communityTakes,
    user,
    listId,
    saved,
    certified,
    cooldowns,
  };
}
