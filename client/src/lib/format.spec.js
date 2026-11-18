import { describe, expect, it } from "vitest";
import { ago } from "./format";

describe("ago", () => {
  const now = Date.UTC(2026, 9, 11, 12, 0, 0);
  it("formats minutes, hours and days", () => {
    expect(ago(now - 20_000, now)).toBe("just now");
    expect(ago(now - 10 * 60_000, now)).toBe("10m ago");
    expect(ago(now - 5 * 3_600_000, now)).toBe("5h ago");
    expect(ago(now - 26 * 3_600_000, now)).toBe("1d ago");
    expect(ago(now - 3 * 86_400_000, now)).toBe("3d ago");
  });
});
