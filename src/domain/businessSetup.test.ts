import { describe, expect, it } from "vitest";
import {
  assessQuoteReliability,
  calculateBusinessSetupStatus,
  createEmptyEconomicSettings,
  createInitialMachine,
  deriveMaterialUnitCosts,
} from "./businessSetup";

describe("business setup", () => {
  it("crea la Bambu Lab P2S sin inventar valores económicos", () => {
    const machine = createInitialMachine("2026-09-19T00:00:00.000Z");
    expect(machine).toMatchObject({ name: "Bambu Lab P2S", brand: "Bambu Lab", model: "P2S", enabled: true });
    expect(machine.machineCostPerHour).toBeUndefined();
    expect(machine.powerWatts).toBeUndefined();
    expect(machine.purchasePrice).toBeUndefined();
    expect(machine.maintenanceReserve).toBeUndefined();
  });

  it("distingue máquina sin tarifa de una tarifa explícita en cero", () => {
    const settings = createEmptyEconomicSettings();
    const pending = calculateBusinessSetupStatus({ machines: [createInitialMachine()], materials: [], settings });
    expect(pending.items.find((item) => item.code === "machine_rate")?.ready).toBe(false);

    const machine = { ...createInitialMachine(), machineCostPerHour: 0 };
    const configured = calculateBusinessSetupStatus({ machines: [machine], materials: [], settings });
    expect(configured.items.find((item) => item.code === "machine_rate")?.ready).toBe(true);
  });

  it("distingue material sin precio de material con precio TEST DATA", () => {
    const settings = createEmptyEconomicSettings();
    const machine = createInitialMachine();
    const pending = calculateBusinessSetupStatus({
      machines: [machine],
      materials: [{ id: "mat", enabled: true, currency: "COP" }],
      settings,
    });
    expect(pending.items.find((item) => item.code === "material_price")?.ready).toBe(false);

    const configured = calculateBusinessSetupStatus({
      machines: [machine],
      materials: [{ id: "mat", enabled: true, currency: "COP", costPerKg: 80_000 }],
      settings,
    });
    expect(configured.items.find((item) => item.code === "material_price")?.ready).toBe(true);
  });

  it("deriva costo por gramo y kg desde la compra TEST DATA", () => {
    expect(deriveMaterialUnitCosts({ purchasePrice: 80_000, initialQuantity: 1_000, unit: "g" })).toEqual({
      costPerBaseUnit: 80,
      costPerKg: 80_000,
    });
  });

  it("marca una cotización parcial cuando faltan tarifas", () => {
    const status = calculateBusinessSetupStatus({
      machines: [createInitialMachine()],
      materials: [],
      settings: createEmptyEconomicSettings(),
    });
    const reliability = assessQuoteReliability(status, "2026-09-19T00:00:00.000Z");
    expect(reliability.level).toBe("partial");
    expect(reliability.missing).toContain("machine_rate");
    expect(reliability.messages.some((message) => message.includes("máquina"))).toBe(true);
  });

  it("marca una cotización completa con todos los parámetros TEST DATA", () => {
    const settings = createEmptyEconomicSettings();
    settings.electricity.value = 1_000;
    settings.labor.value = 20_000;
    settings.pricing.mode = "markup";
    settings.pricing.percentage = 50;
    const machine = { ...createInitialMachine(), machineCostPerHour: 500, powerWatts: 100 };
    const status = calculateBusinessSetupStatus({
      machines: [machine],
      materials: [{ id: "mat", enabled: true, currency: "COP", costPerKg: 80_000 }],
      settings,
    });
    expect(status.complete).toBe(true);
    expect(assessQuoteReliability(status).level).toBe("complete");
  });
});
