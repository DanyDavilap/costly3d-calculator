import { describe, expect, it } from "vitest";
import { FinancialValidationError } from "../core/financialEngineV2";
import { calculateDashboardPricingV2, parseUiNumber } from "./v2PricingAdapter";

describe("v2 UI adapter", () => {
  it("convierte string vacío en cero antes de llegar al núcleo", () => {
    expect(parseUiNumber("", "Tarifa")).toBe(0);
    expect(parseUiNumber("   ", "Tarifa")).toBe(0);
  });

  it("acepta números crudos y no depende de strings monetarios formateados", () => {
    expect(parseUiNumber("80000", "Tarifa")).toBe(80_000);
    expect(parseUiNumber("120.5", "Potencia")).toBe(120.5);
    expect(() => parseUiNumber("$ 80.000", "Tarifa")).toThrow(FinancialValidationError);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])("rechaza %s", (value) => {
    expect(() => parseUiNumber(value, "Tarifa")).toThrow(FinancialValidationError);
  });

  it("usa la tarifa laboral base cuando una tarea no tiene tarifa propia", () => {
    const result = calculateDashboardPricingV2({
      inputs: { timeMinutes: 60, materialGrams: 0, assemblyMinutes: 0 },
      params: {
        filamentCostPerKg: 0,
        powerWatts: 0,
        energyCostPerKwh: 0,
        laborPerHour: 20_000,
        machineCostPerHour: 0,
        wastePercent: 0,
        pricingMode: "markup",
        pricingPercent: 0,
        roundingStrategy: "exact",
      },
      laborTasks: [{ id: "paint", type: "painting", name: "Pintura", minutes: 30 }],
    });

    expect(result.snapshot.labor.tasks[0].hourlyRate).toBe(20_000);
    expect(result.snapshot.labor.totalLaborCost).toBe(10_000);
  });
});
