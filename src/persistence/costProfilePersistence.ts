import { COSTLY_STANDARD_PROFILE, type CostProfileMaterial } from "../domain/costProfile";

export const MATERIAL_PRICES_STORAGE_KEY = "costlyMaterialPricesV1";

export type MaterialPriceMap = Record<CostProfileMaterial["materialType"], number>;

export const DEFAULT_MATERIAL_PRICES: MaterialPriceMap = {
  PLA: COSTLY_STANDARD_PROFILE.materials.find((material) => material.materialType === "PLA")?.costPerKg ?? 0,
  PETG: COSTLY_STANDARD_PROFILE.materials.find((material) => material.materialType === "PETG")?.costPerKg ?? 0,
  TPU: COSTLY_STANDARD_PROFILE.materials.find((material) => material.materialType === "TPU")?.costPerKg ?? 0,
  ABS: COSTLY_STANDARD_PROFILE.materials.find((material) => material.materialType === "ABS")?.costPerKg ?? 0,
};

export const loadMaterialPrices = (storage: Pick<Storage, "getItem">): MaterialPriceMap => {
  try {
    const saved = storage.getItem(MATERIAL_PRICES_STORAGE_KEY);
    if (!saved) return DEFAULT_MATERIAL_PRICES;
    const parsed = JSON.parse(saved) as Partial<MaterialPriceMap>;
    return {
      PLA: Number.isFinite(parsed.PLA) && Number(parsed.PLA) >= 0 ? Number(parsed.PLA) : DEFAULT_MATERIAL_PRICES.PLA,
      PETG: Number.isFinite(parsed.PETG) && Number(parsed.PETG) >= 0 ? Number(parsed.PETG) : DEFAULT_MATERIAL_PRICES.PETG,
      TPU: Number.isFinite(parsed.TPU) && Number(parsed.TPU) >= 0 ? Number(parsed.TPU) : DEFAULT_MATERIAL_PRICES.TPU,
      ABS: Number.isFinite(parsed.ABS) && Number(parsed.ABS) >= 0 ? Number(parsed.ABS) : DEFAULT_MATERIAL_PRICES.ABS,
    };
  } catch {
    return DEFAULT_MATERIAL_PRICES;
  }
};

export const saveMaterialPrices = (
  storage: Pick<Storage, "setItem">,
  prices: MaterialPriceMap,
) => storage.setItem(MATERIAL_PRICES_STORAGE_KEY, JSON.stringify(prices));
