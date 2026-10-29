import { describe, expect, it } from "vitest";
import { DYSFUNCTIONS, PHOTO_SLOTS, VIDEO_SLOTS, rankTop5 } from "@/lib/mecanismo-x";

const f = (id: string, severity: number) => ({
  dysfunction_id: id, severity, rationale: "", myofascial_chain: "", structures_to_investigate: "", release_route: "",
});

describe("Mecanismo X rules", () => {
  it("protocol has 16 photos and 5 videos", () => {
    expect(PHOTO_SLOTS).toHaveLength(16);
    expect(VIDEO_SLOTS).toHaveLength(5);
  });
  it("top 5 keeps at most 5, ordered by largest deviation, only catalog items", () => {
    const ids = DYSFUNCTIONS.slice(0, 7).map((d) => d.id);
    const out = rankTop5([f(ids[0], 2), f(ids[1], 9), f("invalido", 10), f(ids[2], 5), f(ids[3], 7), f(ids[4], 1), f(ids[5], 8)]);
    expect(out.map((o) => o.severity)).toEqual([9, 8, 7, 5, 2]);
  });
});
