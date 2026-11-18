import { describe, expect, it } from "vitest";
import { isLowPower } from "./perf";

describe("isLowPower", () => {
  it("is false for a capable desktop", () => {
    expect(isLowPower({ hardwareConcurrency: 12, deviceMemory: 16 }, 1440)).toBe(false);
  });
  it("is true for data saver, little memory, few cores or a small screen", () => {
    expect(isLowPower({ connection: { saveData: true } }, 1440)).toBe(true);
    expect(isLowPower({ deviceMemory: 2 }, 1440)).toBe(true);
    expect(isLowPower({ hardwareConcurrency: 4 }, 1440)).toBe(true);
    expect(isLowPower({}, 390)).toBe(true);
  });
});
