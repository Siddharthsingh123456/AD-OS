import { describe, expect, it } from "vitest";
import { MODULES } from "./modules";
import { MODULE_COUNT, MODULE_WORD, PLANS, STATS } from "./site";

describe("site copy", () => {
  it("derives module counts from the real module list", () => {
    expect(MODULE_COUNT).toBe(MODULES.length);
    expect(STATS[0][0]).toBe(String(MODULES.length));
    expect(MODULE_WORD).toMatch(/^[a-z-]+$/);
    expect(PLANS[0].feats).toContain(`All ${MODULES.length} modules`);
  });
});
