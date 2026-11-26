"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { createClient } from "@/lib/supabase/client";
import type { EditorData, Item, Placements } from "@/lib/types";
import { DEFAULT_TIERS, POOL } from "@/lib/tiers";
import { LarpCheck } from "./LarpCheck";

// Drop where the pointer is; fall back to overlap for keyboard dragging.
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

type SaveState = "idle" | "saving" | "saved" | "error";

function emptyPlacements(items: Item[]): Placements {
  const p: Placements = { [POOL]: items.map((i) => i.id) };
  for (const t of DEFAULT_TIERS) p[t.id] = [];
  return p;
}

function fromSaved(items: Item[], saved: EditorData["saved"]): Placements {
  const p = emptyPlacements(items);
  const placed = new Set<string>();
  for (const s of [...saved].sort((a, b) => a.position - b.position)) {
    const tier = DEFAULT_TIERS[s.tier];
    if (!tier || placed.has(s.itemId)) continue;
    p[tier.id].push(s.itemId);
    placed.add(s.itemId);
  }
  p[POOL] = items.map((i) => i.id).filter((id) => !placed.has(id));
  return p;
}

function localKey(slug: string) {
  return `diffed:${slug}`;
}

export function TierEditor({ data }: { data: EditorData }) {
  const { template, items, user } = data;
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const [placements, setPlacements] = useState<Placements>(() => fromSaved(items, data.saved));
  const [certified, setCertified] = useState<Set<string>>(() => new Set(data.certified));
  const [cooldowns, setCooldowns] = useState<Record<string, number>>(() =>
    Object.fromEntries(Object.entries(data.cooldowns).map(([k, v]) => [k, Date.parse(v)])),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [now, setNow] = useState(0);
  const listIdRef = useRef<string | null>(data.listId);
  const loadedLocal = useRef(false);

  // Clock for cooldowns, read only in the browser.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  async function ensureList(): Promise<string> {
    if (listIdRef.current) return listIdRef.current;
    const supabase = createClient();
    const { data: row, error } = await supabase
      .from("lists")
      .upsert({ user_id: user!.id, template_id: template.id }, { onConflict: "user_id,template_id" })
      .select("id")
      .single();
    if (error) throw error;
    listIdRef.current = row.id;
    return row.id;
  }

  async function persist(next: Placements, changed: string[]) {
    if (!user) return;
    setSaveState("saving");
    try {
      const listId = await ensureList();
      const supabase = createClient();
      const upserts: { list_id: string; item_id: string; tier_index: number; position: number }[] = [];
      const removals: string[] = [];
      for (const itemId of changed) {
        const tierIdx = DEFAULT_TIERS.findIndex((t) => next[t.id]?.includes(itemId));
        if (tierIdx === -1) removals.push(itemId);
        else
          upserts.push({
            list_id: listId,
            item_id: itemId,
            tier_index: tierIdx,
            position: next[DEFAULT_TIERS[tierIdx].id].indexOf(itemId),
          });
      }
      if (upserts.length) {
        const { error } = await supabase.from("placements").upsert(upserts, { onConflict: "list_id,item_id" });
        if (error) throw error;
      }
      if (removals.length) {
        const { error } = await supabase.from("placements").delete().eq("list_id", listId).in("item_id", removals);
        if (error) throw error;
      }
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  // Signed out: keep the take in this browser. Signed in with nothing saved yet: bring that take along.
  useEffect(() => {
    if (loadedLocal.current) return;
    loadedLocal.current = true;
    try {
      const raw = localStorage.getItem(localKey(template.slug));
      if (!raw) return;
      const local = JSON.parse(raw) as { saved: EditorData["saved"] };
      const known = new Set(items.map((i) => i.id));
      const saved = (local.saved ?? []).filter((s) => known.has(s.itemId));
      if (!user) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPlacements(fromSaved(items, saved));
      } else if (data.saved.length === 0 && saved.length > 0) {
        const next = fromSaved(items, saved);
        setPlacements(next);
        void persist(next, saved.map((s) => s.itemId)).then(() => localStorage.removeItem(localKey(template.slug)));
      }
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user || !loadedLocal.current) return;
    try {
      const saved = DEFAULT_TIERS.flatMap((t, tier) =>
        (placements[t.id] ?? []).map((itemId, position) => ({ itemId, tier, position })),
      );
      localStorage.setItem(localKey(template.slug), JSON.stringify({ saved }));
    } catch {
      /* ignore */
    }
  }, [placements, user, template.slug]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function tierOf(itemId: string): string {
    for (const [tierId, ids] of Object.entries(placements)) if (ids.includes(itemId)) return tierId;
    return POOL;
  }

  function moveItem(itemId: string, toTier: string) {
    if (tierOf(itemId) === toTier) return;
    const next: Placements = {};
    for (const [k, ids] of Object.entries(placements)) next[k] = ids.filter((id) => id !== itemId);
    next[toTier] = [...(next[toTier] ?? []), itemId];
    setPlacements(next);
    void persist(next, [itemId]);
  }

  async function resetAll() {
    const fresh = emptyPlacements(items);
    setPlacements(fresh);
    setSelectedId(null);
    if (user && listIdRef.current) {
      setSaveState("saving");
      const supabase = createClient();
      const { error } = await supabase.from("placements").delete().eq("list_id", listIdRef.current);
      setSaveState(error ? "error" : "saved");
    }
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!e.over) return;
    const itemId = String(e.active.id);
    moveItem(itemId, String(e.over.id));
    setSelectedId(itemId);
  }

  // Stats
  const placedIds = DEFAULT_TIERS.flatMap((t) => placements[t.id] ?? []);
  const certifiedCount = placedIds.filter((id) => certified.has(id)).length;
  const diffs = placedIds
    .filter((id) => data.community[id] !== undefined)
    .map((id) => {
      const mine = DEFAULT_TIERS.findIndex((t) => placements[t.id]?.includes(id));
      return { id, mine, theirs: data.community[id], gap: Math.abs(mine - data.community[id]) };
    });
  const maxGap = DEFAULT_TIERS.length - 1;
  const diffPct = diffs.length
    ? Math.round((diffs.reduce((s, d) => s + d.gap, 0) / (diffs.length * maxGap)) * 100)
    : null;
  const hotTakes = diffs.filter((d) => d.gap >= 2).sort((a, b) => b.gap - a.gap);

  const selected = selectedId ? itemsById.get(selectedId) ?? null : null;
  const selectedTier = selected ? DEFAULT_TIERS.find((t) => t.id === tierOf(selected.id)) ?? null : null;
  const active = activeId ? itemsById.get(activeId) ?? null : null;
  const loginHref = `/login?next=${encodeURIComponent(`/t/${template.slug}`)}`;

  const tile = (id: string) => (
    <Tile
      key={id}
      item={itemsById.get(id)!}
      certified={certified.has(id)}
      onCooldown={(cooldowns[id] ?? 0) > now}
      selected={selectedId === id}
      onSelect={() => setSelectedId(id)}
    />
  );

  return (
    <>
      <div className="row-between">
        <div>
          <p className="muted" style={{ margin: "0 0 4px", fontSize: 13 }}>
            Templates / {template.category}
          </p>
          <h1 style={{ fontSize: 34, letterSpacing: -0.5 }}>{template.title}</h1>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            {user ? `@${user.handle}'s take` : "Your take"} · {placedIds.length} of {items.length} placed ·{" "}
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>{certifiedCount} certified</span>
            {user && (
              <span aria-live="polite">
                {saveState === "saving" && " · Saving…"}
                {saveState === "saved" && " · Saved"}
                {saveState === "error" && <span style={{ color: "var(--danger)" }}> · Couldn&apos;t save. Try again.</span>}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn" onClick={resetAll}>
            Reset
          </button>
          <button type="button" className="btn btn-primary" disabled title="Posting to the feed is coming next">
            Post take
          </button>
        </div>
      </div>

      {!user && (
        <p className="notice">
          This take is only saved in this browser. <Link href={loginHref}>Sign in</Link> to save it to your account
          and take Larp Checks.
        </p>
      )}

      <div className="editor">
        <DndContext
          sensors={sensors}
          collisionDetection={collision}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <section className="editor-main" aria-label="Tier list">
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Drag items into tiers, or tap an item and then tap a tier name.
            </p>
            <div className="board">
              {DEFAULT_TIERS.map((tier) => (
                <div className="tier-row" key={tier.id}>
                  <button
                    type="button"
                    className="tier-label"
                    style={{ background: tier.color }}
                    onClick={() => selectedId && moveItem(selectedId, tier.id)}
                    aria-label={selected ? `Move ${selected.name} to ${tier.name}` : tier.name}
                  >
                    {tier.name}
                  </button>
                  <DropZone id={tier.id}>{(placements[tier.id] ?? []).map(tile)}</DropZone>
                </div>
              ))}
            </div>

            <div className="pool">
              <p className="muted" style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600 }}>
                Not ranked yet ({placements[POOL]?.length ?? 0})
              </p>
              <DropZone id={POOL}>{(placements[POOL] ?? []).map(tile)}</DropZone>
            </div>
          </section>

          <DragOverlay>
            {active ? (
              <div className="tile overlay-tile">
                <span className="tile-name">{active.name}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <aside className="editor-side">
          {selected ? (
            <LarpCheck
              key={selected.id}
              item={selected}
              tierName={selectedTier?.name ?? null}
              signedIn={!!user}
              loginHref={loginHref}
              certified={certified.has(selected.id)}
              cooldownUntil={cooldowns[selected.id] ?? null}
              now={now}
              onPass={() => setCertified((c) => new Set(c).add(selected.id))}
              onFail={(until) => setCooldowns((c) => ({ ...c, [selected.id]: until }))}
            />
          ) : (
            <section className="panel">
              <h2>Larp Check</h2>
              <p className="muted" style={{ margin: 0 }}>
                Select an item to prove you know it. Try Attack on Titan or Steins;Gate.
              </p>
            </section>
          )}

          <section className="panel">
            <h2 style={{ fontSize: 16 }}>Your diff vs. the community</h2>
            {data.communityTakes === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                No community takes yet. Yours could be the first.
              </p>
            ) : diffPct === null ? (
              <p className="muted" style={{ margin: 0 }}>Place a few items to see your diff.</p>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span className="big-number">{diffPct}%</span>
                  <span className="muted">
                    apart · {hotTakes.length} hot take{hotTakes.length === 1 ? "" : "s"}
                  </span>
                </div>
                {hotTakes[0] && (
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "#d4d4d8" }}>
                    Hottest take: <strong>{itemsById.get(hotTakes[0].id)?.name}</strong> in{" "}
                    {DEFAULT_TIERS[hotTakes[0].mine].name}. The community has it in{" "}
                    {DEFAULT_TIERS[hotTakes[0].theirs].name}.
                  </p>
                )}
                <p className="muted" style={{ margin: 0, fontSize: 11 }}>
                  From {data.communityTakes} take{data.communityTakes === 1 ? "" : "s"}. Certified picks count double.
                </p>
              </>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

function DropZone({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`tier-drop${isOver ? " over" : ""}`}>
      {children}
    </div>
  );
}

function Tile({
  item,
  certified,
  onCooldown,
  selected,
  onSelect,
}: {
  item: Item;
  certified: boolean;
  onCooldown: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  const cls = ["tile", certified && "certified", selected && "selected", isDragging && "dragging"]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      type="button"
      className={cls}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="tile-name">{item.name}</span>
      {certified ? (
        <span className="tile-status ok">✓ Certified</span>
      ) : onCooldown ? (
        <span className="tile-status bad">Larp detected</span>
      ) : (
        <span className="tile-status">{item.hasCheck ? "Unverified" : "No check yet"}</span>
      )}
    </button>
  );
}
