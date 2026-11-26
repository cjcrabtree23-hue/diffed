"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Item, Placements, Template } from "@/lib/types";
import { COOLDOWN_MS, DEFAULT_TIERS, POOL } from "@/lib/tiers";
import { LarpCheck } from "./LarpCheck";

// Drop where the pointer is; fall back to overlap for keyboard dragging.
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

type Saved = { placements: Placements; certified: Record<string, true>; cooldowns: Record<string, number> };

function emptyPlacements(template: Template): Placements {
  const p: Placements = { [POOL]: template.items.map((i) => i.id) };
  for (const t of DEFAULT_TIERS) p[t.id] = [];
  return p;
}

function storageKey(slug: string) {
  return `diffed:${slug}`;
}

export function TierEditor({ template }: { template: Template }) {
  const itemsById = useMemo(() => new Map(template.items.map((i) => [i.id, i])), [template]);
  const [placements, setPlacements] = useState<Placements>(() => emptyPlacements(template));
  const [certified, setCertified] = useState<Record<string, true>>({});
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Current time for cooldowns; read only on the client, never during prerender.
  const [now, setNow] = useState(0);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  // Restore this browser's saved take (accounts + database replace this later).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(template.slug));
      if (raw) {
        const saved = JSON.parse(raw) as Saved;
        const known = new Set(template.items.map((i) => i.id));
        const next = emptyPlacements(template);
        const placed = new Set<string>();
        for (const t of DEFAULT_TIERS) {
          next[t.id] = (saved.placements?.[t.id] ?? []).filter((id) => known.has(id) && !placed.has(id));
          next[t.id].forEach((id) => placed.add(id));
        }
        next[POOL] = template.items.map((i) => i.id).filter((id) => !placed.has(id));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPlacements(next);
        setCertified(saved.certified ?? {});
        setCooldowns(saved.cooldowns ?? {});
      }
    } catch {
      /* storage unavailable: start fresh */
    }
    setLoaded(true);
  }, [template]);

  useEffect(() => {
    if (!loaded) return;
    try {
      const data: Saved = { placements, certified, cooldowns };
      localStorage.setItem(storageKey(template.slug), JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [placements, certified, cooldowns, loaded, template.slug]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function tierOf(itemId: string): string {
    for (const [tierId, ids] of Object.entries(placements)) if (ids.includes(itemId)) return tierId;
    return POOL;
  }

  function moveItem(itemId: string, toTier: string) {
    setPlacements((prev) => {
      const next: Placements = {};
      for (const [k, ids] of Object.entries(prev)) next[k] = ids.filter((id) => id !== itemId);
      next[toTier] = [...(next[toTier] ?? []), itemId];
      return next;
    });
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!e.over) return;
    const itemId = String(e.active.id);
    const toTier = String(e.over.id);
    if (tierOf(itemId) !== toTier) moveItem(itemId, toTier);
    setSelectedId(itemId);
  }

  function placeSelected(tierId: string) {
    if (selectedId) moveItem(selectedId, tierId);
  }

  // Stats
  const placedIds = DEFAULT_TIERS.flatMap((t) => placements[t.id] ?? []);
  const certifiedCount = placedIds.filter((id) => certified[id]).length;
  const diffs = placedIds
    .filter((id) => template.community[id] !== undefined)
    .map((id) => {
      const mine = DEFAULT_TIERS.findIndex((t) => placements[t.id]?.includes(id));
      return { id, mine, theirs: template.community[id], gap: Math.abs(mine - template.community[id]) };
    });
  const maxGap = DEFAULT_TIERS.length - 1;
  const diffPct = diffs.length
    ? Math.round((diffs.reduce((s, d) => s + d.gap, 0) / (diffs.length * maxGap)) * 100)
    : null;
  const hotTakes = diffs.filter((d) => d.gap >= 2).sort((a, b) => b.gap - a.gap);

  const selected = selectedId ? itemsById.get(selectedId) ?? null : null;
  const selectedTier = selected ? DEFAULT_TIERS.find((t) => t.id === tierOf(selected.id)) ?? null : null;
  const active = activeId ? itemsById.get(activeId) ?? null : null;

  return (
    <>
      <div className="row-between">
        <div>
          <p className="muted" style={{ margin: "0 0 4px", fontSize: 13 }}>
            Templates / {template.category}
          </p>
          <h1 style={{ fontSize: 34, letterSpacing: -0.5 }}>{template.title}</h1>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Your take · {placedIds.length} of {template.items.length} placed ·{" "}
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>{certifiedCount} certified</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setPlacements(emptyPlacements(template));
              setSelectedId(null);
            }}
          >
            Reset
          </button>
          <button type="button" className="btn btn-primary" disabled title="Posting arrives with accounts">
            Post take
          </button>
        </div>
      </div>

      <div className="editor">
        <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
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
                    onClick={() => placeSelected(tier.id)}
                    aria-label={selected ? `Move ${selected.name} to ${tier.name}` : tier.name}
                  >
                    {tier.name}
                  </button>
                  <DropZone id={tier.id}>
                    {(placements[tier.id] ?? []).map((id) => (
                      <Tile
                        key={id}
                        item={itemsById.get(id)!}
                        certified={!!certified[id]}
                        onCooldown={(cooldowns[id] ?? 0) > now}
                        selected={selectedId === id}
                        onSelect={() => setSelectedId(id)}
                      />
                    ))}
                  </DropZone>
                </div>
              ))}
            </div>

            <div className="pool">
              <p className="muted" style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600 }}>
                Not ranked yet ({placements[POOL]?.length ?? 0})
              </p>
              <DropZone id={POOL}>
                {(placements[POOL] ?? []).map((id) => (
                  <Tile
                    key={id}
                    item={itemsById.get(id)!}
                    certified={!!certified[id]}
                    onCooldown={(cooldowns[id] ?? 0) > now}
                    selected={selectedId === id}
                    onSelect={() => setSelectedId(id)}
                  />
                ))}
              </DropZone>
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
              certified={!!certified[selected.id]}
              cooldownUntil={cooldowns[selected.id] ?? null}
              now={now}
              onPass={() => setCertified((c) => ({ ...c, [selected.id]: true }))}
              onFail={() => {
                const t = Date.now();
                setNow(t);
                setCooldowns((c) => ({ ...c, [selected.id]: t + COOLDOWN_MS }));
              }}
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
            {diffPct === null ? (
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
                <p className="muted" style={{ margin: 0, fontSize: 11 }}>Community numbers are sample data for now.</p>
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
        <span className="tile-status">{item.quiz ? "Unverified" : "No check yet"}</span>
      )}
    </button>
  );
}
