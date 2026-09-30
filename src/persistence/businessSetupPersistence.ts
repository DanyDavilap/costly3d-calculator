import {
  createEmptyEconomicSettings,
  createInitialMachine,
  type BusinessEconomicSettings,
  type Machine,
} from "../domain/businessSetup";

export const MACHINES_STORAGE_KEY = "machinesV2";
export const ECONOMIC_SETTINGS_STORAGE_KEY = "businessEconomicSettingsV2";

type StorageAdapter = Pick<Storage, "getItem" | "setItem">;

export const loadMachines = (storage: Pick<Storage, "getItem">): Machine[] => {
  const saved = storage.getItem(MACHINES_STORAGE_KEY);
  if (!saved) return [createInitialMachine()];
  try {
    const parsed = JSON.parse(saved) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return [createInitialMachine()];
    return (parsed as Machine[]).map((machine) => {
      const isUnmodifiedStarter =
        machine.id === "machine-bambu-lab-p2s" &&
        machine.name === "Bambu Lab P2S" &&
        machine.brand === "Bambu Lab" &&
        machine.model === "P2S" &&
        machine.currency === "COP" &&
        machine.enabled === true &&
        machine.purchasePrice === undefined &&
        machine.machineCostPerHour === undefined &&
        machine.powerWatts === undefined &&
        machine.maintenanceReserve === undefined;
      if (!isUnmodifiedStarter) return machine;
      return {
        ...createInitialMachine(machine.createdAt),
        id: machine.id,
        createdAt: machine.createdAt,
        updatedAt: machine.updatedAt,
      };
    });
  } catch {
    return [createInitialMachine()];
  }
};

export const saveMachines = (storage: StorageAdapter, machines: Machine[]) => {
  storage.setItem(MACHINES_STORAGE_KEY, JSON.stringify(machines));
};

export const loadEconomicSettings = (
  storage: Pick<Storage, "getItem">,
): BusinessEconomicSettings => {
  const fallback = createEmptyEconomicSettings();
  const saved = storage.getItem(ECONOMIC_SETTINGS_STORAGE_KEY);
  if (!saved) return fallback;
  try {
    const parsed = JSON.parse(saved) as Partial<Omit<BusinessEconomicSettings, "schemaVersion">> & {
      schemaVersion?: number;
    };
    const pricing = { ...fallback.pricing, ...parsed.pricing };
    const isLegacyOnePercentMarkup =
      parsed.schemaVersion === 1 && pricing.mode === "markup" && pricing.percentage === 1;
    return {
      ...fallback,
      ...parsed,
      schemaVersion: 2,
      electricity: { ...fallback.electricity, ...parsed.electricity },
      labor: { ...fallback.labor, ...parsed.labor },
      pricing: { ...pricing, ...(isLegacyOnePercentMarkup ? { percentage: 100 } : {}) },
    };
  } catch {
    return fallback;
  }
};

export const saveEconomicSettings = (
  storage: StorageAdapter,
  settings: BusinessEconomicSettings,
) => {
  storage.setItem(ECONOMIC_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
};

