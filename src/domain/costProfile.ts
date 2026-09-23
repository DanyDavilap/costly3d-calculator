import type {
  CommercialRoundingStrategy,
  LaborTaskType,
  PricingMode,
} from "../core/financialEngineV2";

export type CostProfileMaterial = {
  id: string;
  label: string;
  materialType: "PLA" | "PETG" | "TPU" | "ABS";
  costPerKg: number;
  requiresColombiaValidation: boolean;
};

export type MachineCostPreset = {
  id: string;
  label: string;
  powerWatts: number;
  wearPercent: number;
  requiresColombiaValidation: boolean;
};

export type CostProfile = {
  id: string;
  name: string;
  currency: "COP";
  materials: CostProfileMaterial[];
  electricity: { powerWatts: number; costPerKwh: number };
  machine: { wearPercent: number };
  labor: {
    printingHourlyRate: number;
    manualHourlyRates: Record<LaborTaskType, number>;
  };
  failureReservePercent: number;
  pricing: {
    mode: PricingMode;
    percentage: number;
    roundingStrategy: CommercialRoundingStrategy;
  };
  machinePresets: MachineCostPreset[];
  requiresColombiaValidation: boolean;
  validationNote: string;
};

const LEGACY_REFERENCE_RATE = 30_000;
const LEGACY_LABOR_RATE = 1_000;

/**
 * Perfil de arranque construido únicamente con valores de la calculadora
 * anterior. No representa un estudio de mercado colombiano.
 */
export const COSTLY_STANDARD_PROFILE: CostProfile = {
  id: "costly-standard",
  name: "Costly estándar",
  currency: "COP",
  materials: [
    { id: "profile-pla-standard", label: "PLA estándar", materialType: "PLA", costPerKg: LEGACY_REFERENCE_RATE, requiresColombiaValidation: true },
    { id: "profile-petg-standard", label: "PETG estándar", materialType: "PETG", costPerKg: LEGACY_REFERENCE_RATE, requiresColombiaValidation: true },
    { id: "profile-tpu-standard", label: "TPU estándar", materialType: "TPU", costPerKg: LEGACY_REFERENCE_RATE, requiresColombiaValidation: true },
    { id: "profile-abs-standard", label: "ABS estándar", materialType: "ABS", costPerKg: LEGACY_REFERENCE_RATE, requiresColombiaValidation: true },
  ],
  electricity: { powerWatts: 80, costPerKwh: 100 },
  machine: { wearPercent: 5 },
  labor: {
    printingHourlyRate: LEGACY_LABOR_RATE,
    manualHourlyRates: {
      assembly: LEGACY_LABOR_RATE,
      support_removal: LEGACY_LABOR_RATE,
      sanding: LEGACY_LABOR_RATE,
      gluing: LEGACY_LABOR_RATE,
      painting: LEGACY_LABOR_RATE,
      finishing: LEGACY_LABOR_RATE,
      packing: LEGACY_LABOR_RATE,
      other: LEGACY_LABOR_RATE,
    },
  },
  failureReservePercent: 5,
  pricing: { mode: "markup", percentage: 40, roundingStrategy: "exact" },
  // Contrato preparado para futuros presets Bambu, Creality y Snapmaker.
  machinePresets: [],
  requiresColombiaValidation: true,
  validationNote:
    "Referencias heredadas de la calculadora anterior. Deben validarse para Colombia antes de publicarse como definitivas.",
};

export const DEFAULT_PROFILE_MATERIAL_ID = COSTLY_STANDARD_PROFILE.materials[0].id;

export const findProfileMaterial = (id: string) =>
  COSTLY_STANDARD_PROFILE.materials.find((material) => material.id === id);

export const findProfileMaterialByType = (materialType?: string) => {
  const normalized = materialType?.trim().toUpperCase();
  return COSTLY_STANDARD_PROFILE.materials.find(
    (material) => material.materialType === normalized,
  );
};

export const getManualLaborRate = (type: LaborTaskType) =>
  COSTLY_STANDARD_PROFILE.labor.manualHourlyRates[type];
