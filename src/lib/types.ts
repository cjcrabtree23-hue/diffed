export type TierDef = {
  id: string;
  name: string;
  color: string;
};

export type Item = {
  id: string; // uuid
  slug: string;
  name: string;
  hasCheck: boolean; // has Larp Check questions
};

export type TemplateSummary = {
  id: string;
  slug: string;
  title: string;
  category: string;
  itemCount: number;
};

export type EditorData = {
  template: { id: string; slug: string; title: string; category: string };
  items: Item[];
  /** item id -> community tier index (rounded weighted average) */
  community: Record<string, number>;
  communityTakes: number;
  user: { id: string; handle: string } | null;
  listId: string | null;
  /** item id -> saved tier index, in saved order */
  saved: { itemId: string; tier: number; position: number }[];
  certified: string[];
  /** item id -> ISO time the cooldown ends */
  cooldowns: Record<string, string>;
};

/** tierId -> ordered item ids; "pool" holds unranked items. */
export type Placements = Record<string, string[]>;

export type LarpQuestion = { id: string; prompt: string; options: string[] };
