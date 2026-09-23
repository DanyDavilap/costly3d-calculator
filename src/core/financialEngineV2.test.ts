import { describe, expect, it } from "vitest";
import {
  FinancialValidationError,
  calculateCostV2,
  calculatePricing,
  roundCommercialPrice,
  type CostEngineV2Input,
} from "./financialEngineV2";

const baseInput = (): CostEngineV2Input => ({
  printTimeMinutes: 0,
  powerWatts: 0,
  energyCostPerKwh: 0,
  machineCostPerHour: 0,
  material: {
    materialName: "PLA TEST DATA",
    netGrams: 0,
    wastePercent: 0,
    costPerKg: 0,
    costContextDate: "2026-09-19T00:00:00.000Z",
  },
  laborTasks: [],
  additionalItems: [],
  pricing: { mode: "markup", percentage: 0, roundingStrategy: "exact" },
});

describe("financialEngineV2", () => {
  it("calcula 100 g a 80.000 COP/kg como 8.000 COP", () => {
    const input = baseInput();
    input.material.netGrams = 100;
    input.material.costPerKg = 80_000;

    const result = calculateCostV2(input);

    expect(result.material.costPerGram).toBe(80);
    expect(result.material.netMaterialCost).toBe(8_000);
    expect(result.material.totalMaterialCost).toBe(8_000);
    expect(result.currency).toBe("COP");
    expect(result.calculationModelVersion).toBe("costly3d-v2");
  });

  it("separa consumo físico y costo de electricidad", () => {
    const input = baseInput();
    input.printTimeMinutes = 10 * 60;
    input.powerWatts = 120;
    input.energyCostPerKwh = 1_000;

    const result = calculateCostV2(input);

    expect(result.energy.powerKw).toBe(0.12);
    expect(result.energy.energyKwh).toBeCloseTo(1.2, 12);
    expect(result.energy.energyCost).toBeCloseTo(1_200, 12);
  });

  it("calcula costo de máquina separado de electricidad", () => {
    const input = baseInput();
    input.printTimeMinutes = 10 * 60;
    input.machineCostPerHour = 500;

    const result = calculateCostV2(input);

    expect(result.machine.machineCost).toBe(5_000);
    expect(result.energy.energyCost).toBe(0);
  });

  it("separa mano de obra de impresión, desgaste y reserva por fallos", () => {
    const input = baseInput();
    input.printTimeMinutes = 120;
    input.material.netGrams = 100;
    input.material.costPerKg = 30_000;
    input.powerWatts = 80;
    input.energyCostPerKwh = 100;
    input.printingLaborCostPerHour = 1_000;
    input.wearPercent = 5;
    input.failureReservePercent = 5;

    const result = calculateCostV2(input);

    expect(result.material.totalMaterialCost).toBe(3_000);
    expect(result.energy.energyCost).toBe(16);
    expect(result.printingLabor.totalCost).toBe(2_000);
    expect(result.machine.wearCost).toBeCloseTo(250.8, 10);
    expect(result.failureReserve.totalCost).toBeCloseTo(263.34, 10);
    expect(result.estimatedProductionCost).toBeCloseTo(5_530.14, 10);
  });

  it("suma múltiples tareas de mano de obra", () => {
    const input = baseInput();
    input.laborTasks = [
      {
        id: "sanding-test",
        type: "sanding",
        minutes: 90,
        hourlyRate: 20_000,
      },
    ];

    const result = calculateCostV2(input);

    expect(result.labor.tasks[0].totalCost).toBe(30_000);
    expect(result.labor.totalLaborCost).toBe(30_000);
  });

  it("separa peso neto y desperdicio planificado", () => {
    const input = baseInput();
    input.material.netGrams = 100;
    input.material.wastePercent = 10;
    input.material.costPerKg = 80_000;

    const result = calculateCostV2(input);

    expect(result.material.wasteGrams).toBeCloseTo(10, 12);
    expect(result.material.billableGrams).toBeCloseTo(110, 12);
    expect(result.material.wasteMaterialCost).toBeCloseTo(800, 12);
    expect(result.material.totalMaterialCost).toBeCloseTo(8_800, 12);
  });

  it("calcula adicionales por cantidad sin mezclarlos con mano de obra", () => {
    const input = baseInput();
    input.additionalItems = [
      {
        id: "magnet-test",
        name: "Imán TEST DATA",
        quantity: 4,
        unitCost: 250,
        category: "magnet",
      },
    ];

    const result = calculateCostV2(input);

    expect(result.additional.items[0].totalCost).toBe(1_000);
    expect(result.additional.totalAdditionalCost).toBe(1_000);
    expect(result.labor.totalLaborCost).toBe(0);
  });

  it("aplica markup y reporta el margen resultante", () => {
    const result = calculatePricing(100_000, {
      mode: "markup",
      percentage: 50,
      roundingStrategy: "exact",
    });

    expect(result.mathematicalPrice).toBe(150_000);
    expect(result.mathematicalProfit).toBe(50_000);
    expect(result.resultingMarginPercent).toBeCloseTo(33.33333333333333, 10);
    expect(result.resultingMarkupPercent).toBe(50);
  });

  it("aplica margen objetivo y reporta el markup resultante", () => {
    const result = calculatePricing(100_000, {
      mode: "target_margin",
      percentage: 50,
      roundingStrategy: "exact",
    });

    expect(result.mathematicalPrice).toBe(200_000);
    expect(result.mathematicalProfit).toBe(100_000);
    expect(result.resultingMarginPercent).toBe(50);
    expect(result.resultingMarkupPercent).toBe(100);
  });

  it.each([
    ["exact", 32_347],
    ["nearest100", 32_300],
    ["nearest500", 32_500],
    ["nearest1000", 32_000],
  ] as const)("aplica redondeo comercial %s", (strategy, expected) => {
    expect(roundCommercialPrice(32_347, strategy)).toBe(expected);
  });

  it("mantiene el precio matemático separado del comercial", () => {
    const result = calculatePricing(32_347, {
      mode: "markup",
      percentage: 0,
      roundingStrategy: "nearest1000",
    });

    expect(result.mathematicalPrice).toBe(32_347);
    expect(result.commercialPrice).toBe(32_000);
    expect(result.commercialProfit).toBe(-347);
  });

  it("acepta ceros y markup cero", () => {
    const result = calculateCostV2(baseInput());
    expect(result.estimatedProductionCost).toBe(0);
    expect(result.pricing.commercialPrice).toBe(0);
  });

  it("acepta margen objetivo cero", () => {
    const result = calculatePricing(100_000, {
      mode: "target_margin",
      percentage: 0,
      roundingStrategy: "exact",
    });

    expect(result.commercialPrice).toBe(100_000);
    expect(result.commercialProfit).toBe(0);
    expect(result.resultingMarginPercent).toBe(0);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rechaza costo de material inválido: %s",
    (invalid) => {
      const input = baseInput();
      input.material.costPerKg = invalid;
      expect(() => calculateCostV2(input)).toThrow(FinancialValidationError);
    },
  );

  it.each([100, 120])("rechaza margen objetivo %s %%", (percentage) => {
    expect(() =>
      calculatePricing(100_000, {
        mode: "target_margin",
        percentage,
        roundingStrategy: "exact",
      }),
    ).toThrow(FinancialValidationError);
  });

  it("rechaza cantidades de adicionales inválidas", () => {
    const input = baseInput();
    input.additionalItems = [
      {
        id: "invalid-test",
        name: "TEST DATA",
        quantity: 0,
        unitCost: 10,
        category: "other",
      },
    ];
    expect(() => calculateCostV2(input)).toThrow(FinancialValidationError);
  });

  it("conserva fracciones internas y grandes valores COP", () => {
    const input = baseInput();
    input.material.netGrams = 123.456;
    input.material.wastePercent = 7.25;
    input.material.costPerKg = 987_654_321;

    const result = calculateCostV2(input);
    const expected = 123.456 * 1.0725 * (987_654_321 / 1000);

    expect(result.material.totalMaterialCost).toBeCloseTo(expected, 5);
    expect(result.material.billableGrams).toBeCloseTo(132.40656, 10);
  });
});
