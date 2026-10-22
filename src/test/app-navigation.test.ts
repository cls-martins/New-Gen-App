import { describe, expect, it } from "vitest";
import { canComposeOnPage, MOBILE_NAV_LABELS } from "@/lib/app-navigation";

describe("Publishing locations", () => {
  it("allows publishing on the feed and profiles", () => {
    expect(canComposeOnPage("/feed")).toBe(true);
    expect(canComposeOnPage("/u/newgen")).toBe(true);
  });
  it.each(["/messages", "/premium", "/settings", "/admin", "/notifications", "/search"])("does not show publishing on %s", (path) => {
    expect(canComposeOnPage(path)).toBe(false);
  });
  it("includes Premium and Admin in mobile destinations", () => {
    expect(MOBILE_NAV_LABELS).toContain("Premium");
    expect(MOBILE_NAV_LABELS).toContain("Admin");
  });
});