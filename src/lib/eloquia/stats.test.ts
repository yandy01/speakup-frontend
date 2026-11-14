import { describe, expect, it } from "vitest";
import { computeXp, streakOf } from "./stats";

describe("XP", () => {
  it("counts only the best exercise score, halved", () => {
    expect(computeXp([{ exercise_id: "a", score: 60 }, { exercise_id: "a", score: 100 }], [])).toBe(50);
  });
  it("adds challenge and reading XP", () => {
    expect(computeXp([], [{ xp_earned: 30 }, { xp_earned: 12 }])).toBe(42);
  });
});
describe("streak", () => {
  it("counts consecutive days ending today", () => {
    const d = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
    expect(streakOf([d(0), d(1), d(2), d(4)])).toBe(3);
  });
});
