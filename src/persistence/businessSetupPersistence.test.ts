import { describe, expect, it } from "vitest";
import { createInitialMachine } from "../domain/businessSetup";
import {
  ECONOMIC_SETTINGS_STORAGE_KEY,
  loadEconomicSettings,
  loadMachines,
  MACHINES_STORAGE_KEY,
} from "./businessSetupPersistence";

const createStorage = (saved?: string) => ({
  getItem: (key: string) => (key === MACHINES_STORAGE_KEY ? saved ?? null : null),
});

describe("business setup persistence", () => {
  it("migrates only the untouched Bambu starter to Snapmaker U1", () => {
    const legacyStarter = {
      id: "machine-bambu-lab-p2s",
      name: "Bambu Lab P2S",
      brand: "Bambu Lab",
      model: "P2S",
      currency: "COP",
      enabled: true,
      createdAt: "2026-09-19T00:00:00.000Z",
      updatedAt: "2026-09-19T00:00:00.000Z",
    };

    expect(loadMachines(createStorage(JSON.stringify([legacyStarter])))[0]).toMatchObject({
      id: legacyStarter.id,
      name: "Snapmaker U1",
      powerWatts: 400,
      createdAt: legacyStarter.createdAt,
    });
  });

  it("preserves configured machines", () => {
    const configuredMachine = { ...createInitialMachine(), name: "Mi U1", purchasePrice: 2_000_000 };
    expect(loadMachines(createStorage(JSON.stringify([configuredMachine])))).toEqual([configuredMachine]);
  });

  it("migrates legacy 1% markup to the Costly 100% reference", () => {
    const legacySettings = {
      schemaVersion: 1,
      currency: "COP",
      electricity: { currency: "COP", value: 1_000 },
      labor: { currency: "COP", value: 20_000 },
      pricing: { mode: "markup", percentage: 1, roundingStrategy: "exact" },
      updatedAt: "2026-09-19T00:00:00.000Z",
    };
    const storage = {
      getItem: (key: string) =>
        key === ECONOMIC_SETTINGS_STORAGE_KEY ? JSON.stringify(legacySettings) : null,
    };

    expect(loadEconomicSettings(storage)).toMatchObject({
      schemaVersion: 2,
      electricity: { value: 1_000 },
      labor: { value: 20_000 },
      pricing: { mode: "markup", percentage: 100 },
    });
  });

  it("keeps other legacy pricing percentages unchanged", () => {
    const legacySettings = {
      schemaVersion: 1,
      pricing: { mode: "markup", percentage: 35, roundingStrategy: "exact" },
    };
    const storage = {
      getItem: (key: string) =>
        key === ECONOMIC_SETTINGS_STORAGE_KEY ? JSON.stringify(legacySettings) : null,
    };

    expect(loadEconomicSettings(storage).pricing.percentage).toBe(35);
  });
});