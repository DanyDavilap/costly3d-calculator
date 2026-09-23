import { describe, expect, it } from "vitest";
import {
  COSTLY_STANDARD_PROFILE,
  DEFAULT_PROFILE_MATERIAL_ID,
  findProfileMaterial,
} from "./costProfile";

describe("Costly estándar", () => {
  it("inicia con PLA estándar y una estrategia activa", () => {
    expect(findProfileMaterial(DEFAULT_PROFILE_MATERIAL_ID)?.label).toBe("PLA estándar");
    expect(COSTLY_STANDARD_PROFILE.pricing.mode).toBe("markup");
    expect(COSTLY_STANDARD_PROFILE.pricing.percentage).toBeGreaterThan(0);
  });

  it("mantiene centralizadas y marcadas las referencias por validar", () => {
    expect(COSTLY_STANDARD_PROFILE.requiresColombiaValidation).toBe(true);
    expect(COSTLY_STANDARD_PROFILE.materials.every((material) => material.requiresColombiaValidation)).toBe(true);
    expect(COSTLY_STANDARD_PROFILE.machine.wearPercent).toBe(5);
  });
});
