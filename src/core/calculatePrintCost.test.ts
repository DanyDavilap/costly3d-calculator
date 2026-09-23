import { describe, expect, it } from "vitest";
import { calculatePrintCost } from "./calculatePrintCost";

describe("calculatePrintCost legacy-v1", () => {
  it("caracteriza la fórmula histórica sin reinterpretarla como margen", () => {
    const result = calculatePrintCost({
      inputs: {
        timeMinutes: 60,
        materialGrams: 100,
        assemblyMinutes: 60,
      },
      params: {
        filamentCostPerKg: 80_000,
        powerWatts: 1_000,
        energyCostPerKwh: 1_000,
        laborPerHour: 20_000,
        wearPercent: 10,
        operationalPercent: 5,
        profitPercent: 50,
      },
    });

    expect(result.materialCost).toBe(8_000);
    expect(result.energyCost).toBe(1_000);
    expect(result.laborCost).toBe(20_000);
    expect(result.baseCost).toBe(29_000);
    expect(result.wearCost).toBe(2_900);
    expect(result.operatingCost).toBe(1_450);
    expect(result.subtotal).toBe(33_350);
    expect(result.profit).toBe(16_675);
    expect(result.totalFinal).toBe(50_025);
  });
});

