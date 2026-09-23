import { describe, expect, it } from "vitest";
import type { CostEngineV2Input } from "./financialEngineV2";
import { FinancialValidationError } from "./financialEngineV2";
import { calculateQuoteV2 } from "./quoteCalculatorV2";

const input = (): CostEngineV2Input => ({
  printTimeMinutes: 60,
  powerWatts: 100,
  energyCostPerKwh: 1_000,
  machineCostPerHour: 500,
  material: {
    spoolId: "spool-test",
    materialName: "PLA TEST DATA",
    netGrams: 100,
    wastePercent: 10,
    costPerKg: 80_000,
    costContextDate: "2026-09-19T00:00:00.000Z",
  },
  laborTasks: [],
  additionalItems: [{ id: "box", name: "Caja TEST DATA", quantity: 1, unitCost: 3_000, category: "packaging" }],
  pricing: { mode: "markup", percentage: 50, roundingStrategy: "nearest500" },
});

describe("quoteCalculatorV2", () => {
  it("separa costo y precio por unidad de los totales del lote", () => {
    const result = calculateQuoteV2(input(), 3);
    expect(result.quantity).toBe(3);
    expect(result.lot.estimatedProductionCost).toBeCloseTo(result.unit.estimatedProductionCost * 3, 10);
    expect(result.lot.commercialPrice).toBe(result.unit.pricing.commercialPrice * 3);
    expect(result.lot.commercialProfit).toBeCloseTo(result.unit.pricing.commercialProfit * 3, 10);
  });

  it("rechaza cantidad cero", () => {
    expect(() => calculateQuoteV2(input(), 0)).toThrow(FinancialValidationError);
  });

  it("snapshot del spool no cambia al modificar el precio fuente", () => {
    const source = input();
    const result = calculateQuoteV2(source, 1);
    source.material.costPerKg = 120_000;
    expect(result.unit.material.costPerKg).toBe(80_000);
    expect(result.unit.material.totalMaterialCost).toBe(8_800);
  });

  it("incluye line items adicionales en unidad y lote", () => {
    const result = calculateQuoteV2(input(), 2);
    expect(result.unit.additional.totalAdditionalCost).toBe(3_000);
    expect(result.lot.additionalCost).toBe(6_000);
  });
});

