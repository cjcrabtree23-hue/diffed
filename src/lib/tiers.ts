import type { TierDef } from "./types";

export const DEFAULT_TIERS: TierDef[] = [
  { id: "true-peak", name: "True Peak", color: "#C6FF3D" },
  { id: "peak", name: "Peak", color: "#7CEBA0" },
  { id: "valid", name: "Valid", color: "#6CC4FF" },
  { id: "mid", name: "Mid", color: "#FFD54A" },
  { id: "cooked", name: "Cooked", color: "#FF9A52" },
  { id: "never-peak", name: "Never Peak", color: "#FF6B81" },
];

export const POOL = "pool";

/** Larp Check rules */
export const QUIZ_LENGTH = 5;
export const PASS_MARK = 4;
export const SECONDS_PER_QUESTION = 20;
export const COOLDOWN_MS = 24 * 60 * 60 * 1000;
