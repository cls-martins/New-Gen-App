import { describe, expect, it } from "vitest";
import { NAME_EFFECTS, AVATAR_FRAMES, BANNER_FRAMES, COMMENT_STYLES } from "@/lib/premium-fx";

describe("Premium options", () => {
  it("name effects have at least 15 options", () => expect(NAME_EFFECTS.length).toBeGreaterThanOrEqual(15));
  it("avatar frames have at least 15 options", () => expect(AVATAR_FRAMES.length).toBeGreaterThanOrEqual(15));
  it("banner frames have at least 15 options", () => expect(BANNER_FRAMES.length).toBeGreaterThanOrEqual(15));
  it("comment styles have at least 15 options", () => expect(COMMENT_STYLES.length).toBeGreaterThanOrEqual(15));
});
