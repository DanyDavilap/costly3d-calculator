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
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as Machine[]) : [createInitialMachine()];
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
    const parsed = JSON.parse(saved) as Partial<BusinessEconomicSettings>;
    return {
      ...fallback,
      ...parsed,
      electricity: { ...fallback.electricity, ...parsed.electricity },
      labor: { ...fallback.labor, ...parsed.labor },
      pricing: { ...fallback.pricing, ...parsed.pricing },
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

