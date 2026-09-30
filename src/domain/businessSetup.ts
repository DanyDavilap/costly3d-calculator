import type { SupportedCurrency } from "../config/regional";
import type { CommercialRoundingStrategy, PricingMode } from "../core/financialEngineV2";

export type Machine = {
  id: string;
  name: string;
  brand: string;
  model: string;
  purchasePrice?: number;
  currency: SupportedCurrency;
  machineCostPerHour?: number;
  powerWatts?: number;
  maintenanceReserve?: number;
  specifications?: MachineSpecifications;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MachineSpecifications = {
  technology: string;
  dimensionsMm: { width: number; depth: number; height: number };
  weightKg: number;
  buildVolumeMm: { x: number; y: number; z: number };
  maxToolheadSpeedMmPerSecond: number;
  maxAccelerationMmPerSecondSquared: number;
  toolheadCount: number;
  nozzleDiameterMm: number;
  filamentDiameterMm: number;
  maxNozzleTemperatureC: number;
  maxBedTemperatureC: number;
  supportedMaterials: { setup: string; materials: string[] }[];
  inputPowerRatings: { voltageRange: string; watts: number }[];
  sourceUrl: string;
};

export type DatedRate = {
  value?: number;
  currency: "COP";
  validFrom?: string;
  notes?: string;
};

export type PricingPreference = {
  mode?: PricingMode;
  percentage?: number;
  roundingStrategy: CommercialRoundingStrategy;
};

export type BusinessEconomicSettings = {
  schemaVersion: 2;
  currency: "COP";
  electricity: DatedRate;
  labor: DatedRate;
  pricing: PricingPreference;
  updatedAt: string;
};

export type PricedMaterial = {
  id: string;
  enabled: boolean;
  currency: SupportedCurrency;
  costPerKg?: number;
};

export type SetupItemCode =
  | "currency"
  | "machine"
  | "machine_power"
  | "machine_rate"
  | "material_price"
  | "electricity_rate"
  | "labor_rate"
  | "pricing";

export type BusinessSetupItem = {
  code: SetupItemCode;
  label: string;
  ready: boolean;
  detail: string;
};

export type BusinessSetupStatus = {
  readyCount: number;
  totalCount: number;
  complete: boolean;
  items: BusinessSetupItem[];
};

export type QuoteReliability = {
  level: "complete" | "partial";
  capturedAt: string;
  missing: SetupItemCode[];
  messages: string[];
};

export const createInitialMachine = (now = new Date().toISOString()): Machine => ({
  id: "machine-snapmaker-u1",
  name: "Snapmaker U1",
  brand: "Snapmaker",
  model: "U1",
  currency: "COP",
  powerWatts: 400,
  specifications: {
    technology: "FDM",
    dimensionsMm: { width: 584, depth: 499, height: 730 },
    weightKg: 18.2,
    buildVolumeMm: { x: 270, y: 270, z: 270 },
    maxToolheadSpeedMmPerSecond: 500,
    maxAccelerationMmPerSecondSquared: 20_000,
    toolheadCount: 4,
    nozzleDiameterMm: 0.4,
    filamentDiameterMm: 1.75,
    maxNozzleTemperatureC: 300,
    maxBedTemperatureC: 100,
    supportedMaterials: [
      { setup: "Configuración base", materials: ["PLA", "PETG", "TPU", "PVA", "PCTG"] },
      {
        setup: "Con cubierta superior",
        materials: ["PLA", "PETG", "TPU", "PVA", "PET", "ABS", "ASA", "PA", "PC"],
      },
      {
        setup: "Con cubierta y boquilla de acero endurecido",
        materials: [
          "PLA", "PETG", "TPU", "PVA", "PET", "ABS", "ASA", "PA", "PC",
          "Polímero reforzado con fibra de carbono",
          "Polímero reforzado con fibra de vidrio",
        ],
      },
    ],
    inputPowerRatings: [
      { voltageRange: "100-120 V", watts: 400 },
      { voltageRange: "220-240 V", watts: 1150 },
    ],
    sourceUrl: "https://www.snapmaker.com/en-US/snapmaker-u1/specs",
  },
  enabled: true,
  createdAt: now,
  updatedAt: now,
});

export const createEmptyEconomicSettings = (
  now = new Date().toISOString(),
): BusinessEconomicSettings => ({
  schemaVersion: 2,
  currency: "COP",
  electricity: { currency: "COP" },
  labor: { currency: "COP" },
  pricing: { roundingStrategy: "exact" },
  updatedAt: now,
});

export const isConfiguredRate = (value: number | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

export const calculateBusinessSetupStatus = ({
  machines,
  materials,
  settings,
}: {
  machines: Machine[];
  materials: PricedMaterial[];
  settings: BusinessEconomicSettings;
}): BusinessSetupStatus => {
  const activeMachine = machines.find((machine) => machine.enabled);
  const pricedMaterial = materials.find(
    (material) =>
      material.enabled && material.currency === "COP" && isConfiguredRate(material.costPerKg),
  );
  const pricingReady =
    settings.pricing.mode !== undefined && isConfiguredRate(settings.pricing.percentage);

  const items: BusinessSetupItem[] = [
    { code: "currency", label: "Moneda COP", ready: true, detail: "CO / COP" },
    {
      code: "machine",
      label: "Máquina de producción",
      ready: Boolean(activeMachine),
      detail: activeMachine?.name ?? "Sin máquina activa",
    },
    {
      code: "machine_rate",
      label: "Tarifa de máquina",
      ready: isConfiguredRate(activeMachine?.machineCostPerHour),
      detail: isConfiguredRate(activeMachine?.machineCostPerHour)
        ? "Tarifa confirmada"
        : "Sin configurar",
    },
    {
      code: "machine_power",
      label: "Potencia de máquina",
      ready: isConfiguredRate(activeMachine?.powerWatts),
      detail: isConfiguredRate(activeMachine?.powerWatts)
        ? "Potencia confirmada"
        : "Sin configurar",
    },
    {
      code: "material_price",
      label: "Material con precio",
      ready: Boolean(pricedMaterial),
      detail: pricedMaterial ? "Costo COP disponible" : "Sin configurar",
    },
    {
      code: "electricity_rate",
      label: "Electricidad",
      ready: isConfiguredRate(settings.electricity.value),
      detail: isConfiguredRate(settings.electricity.value) ? "Tarifa confirmada" : "Sin configurar",
    },
    {
      code: "labor_rate",
      label: "Mano de obra",
      ready: isConfiguredRate(settings.labor.value),
      detail: isConfiguredRate(settings.labor.value) ? "Tarifa confirmada" : "Sin configurar",
    },
    {
      code: "pricing",
      label: "Estrategia de precio",
      ready: pricingReady,
      detail: pricingReady ? "Estrategia confirmada" : "Sin configurar",
    },
  ];
  const readyCount = items.filter((item) => item.ready).length;

  return { readyCount, totalCount: items.length, complete: readyCount === items.length, items };
};

const reliabilityMessages: Partial<Record<SetupItemCode, string>> = {
  machine: "Selecciona una máquina activa.",
  machine_power: "Esta estimación no puede calcular electricidad porque la potencia de la máquina no está configurada.",
  machine_rate: "Esta estimación no incluye costo de máquina porque la tarifa no está configurada.",
  material_price: "Esta estimación no incluye un precio confirmado para el material seleccionado.",
  electricity_rate: "Esta estimación no incluye electricidad porque la tarifa no está configurada.",
  labor_rate: "La tarifa base de mano de obra no está configurada; las tareas sin tarifa propia usan cero.",
  pricing: "Selecciona una estrategia y un porcentaje de precio.",
};

export const assessQuoteReliability = (
  status: BusinessSetupStatus,
  capturedAt = new Date().toISOString(),
): QuoteReliability => {
  const missing = status.items
    .filter((item) => !item.ready && item.code !== "currency")
    .map((item) => item.code);
  return {
    level: missing.length === 0 ? "complete" : "partial",
    capturedAt,
    missing,
    messages: missing.map((code) => reliabilityMessages[code] ?? `${code} sin configurar.`),
  };
};

export type MaterialPurchaseInput = {
  purchasePrice?: number;
  initialQuantity?: number;
  unit: "g" | "kg" | "ml" | "l";
};

export const deriveMaterialUnitCosts = ({
  purchasePrice,
  initialQuantity,
  unit,
}: MaterialPurchaseInput): { costPerBaseUnit?: number; costPerKg?: number } => {
  if (
    !isConfiguredRate(purchasePrice) ||
    typeof initialQuantity !== "number" ||
    !Number.isFinite(initialQuantity) ||
    initialQuantity <= 0
  ) {
    return {};
  }

  const baseQuantity = unit === "kg" || unit === "l" ? initialQuantity * 1000 : initialQuantity;
  const costPerBaseUnit = purchasePrice / baseQuantity;
  return {
    costPerBaseUnit,
    costPerKg: unit === "g" || unit === "kg" ? costPerBaseUnit * 1000 : undefined,
  };
};
