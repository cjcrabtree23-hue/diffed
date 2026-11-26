export type TierDef = {
  id: string;
  name: string;
  color: string;
};

export type QuizQuestion = {
  prompt: string;
  options: string[];
  answer: number; // index into options
};

export type Item = {
  id: string;
  name: string;
  /** Larp Check questions; items without a quiz can't be certified yet. */
  quiz?: QuizQuestion[];
};

export type Template = {
  slug: string;
  title: string;
  category: string;
  source: string;
  items: Item[];
  /** Sample community placement per item id (tier index). Replace with real averages later. */
  community: Record<string, number>;
};

/** tierId -> ordered item ids; "pool" holds unranked items. */
export type Placements = Record<string, string[]>;
