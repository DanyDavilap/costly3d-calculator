import {
  COLOMBIA_REGIONAL_CONFIG,
  type RegionalConfig,
  type SupportedCurrency,
} from "../config/regional";

export const FINANCIAL_SCHEMA_VERSION = 2 as const;
export const CALCULATION_MODEL_VERSION = "costly3d-v2" as const;

export type PricingMode = "markup" | "target_margin";
export type CommercialRoundingStrategy =
  | "exact"
  | "nearest100"
  | "nearest500"
  | "nearest1000";

export type LaborTaskType =
  | "assembly"
  | "support_removal"
  | "sanding"
  | "gluing"
  | "painting"
  | "finishing"
  | "packing"
  | "other";

export type LaborTaskInput = {
  id: string;
  type: LaborTaskType;
  name?: string;
  minutes: number;
  hourlyRate: number;
};

export type AdditionalCostCategory =
  | "paint"
  | "adhesive"
  | "insert"
  | "magnet"
  | "packaging"
  | "label"
  | "external_service"
  | "other";

export type AdditionalLineItemInput = {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  category: AdditionalCostCategory;
};

export type MaterialCostInput = {
  materialId?: string;
  spoolId?: string;
  materialName: string;
  brand?: string;
  materialType?: string;
  color?: string;
  technology?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  purchaseQuantity?: number;
  purchaseUnit?: string;
  netGrams: number;
  wastePercent: number;
  costPerKg: number;
  costContextDate: string;
};

export type MachineSnapshotInput = {
  machineId?: string;
  name?: string;
  brand?: string;
  model?: string;
};

export type PricingInput = {
  mode: PricingMode;
  percentage: number;
  roundingStrategy: CommercialRoundingStrategy;
};

export type CostEngineV2Input = {
  printTimeMinutes: number;
  powerWatts: number;
  energyCostPerKwh: number;
  machineCostPerHour: number;
  printingLaborCostPerHour?: number;
  wearPercent?: number;
  failureReservePercent?: number;
  material: MaterialCostInput;
  laborTasks: LaborTaskInput[];
  additionalItems: AdditionalLineItemInput[];
  pricing: PricingInput;
  machine?: MachineSnapshotInput;
  regional?: RegionalConfig;
};

export type MaterialCostSnapshot = MaterialCostInput & {
  costPerGram: number;
  wasteGrams: number;
  billableGrams: number;
  netMaterialCost: number;
  wasteMaterialCost: number;
  totalMaterialCost: number;
  currency: SupportedCurrency;
};

export type LaborTaskSnapshot = LaborTaskInput & {
  totalCost: number;
};

export type AdditionalLineItemSnapshot = AdditionalLineItemInput & {
  totalCost: number;
};

export type CostEngineV2Result = {
  schemaVersion: typeof FINANCIAL_SCHEMA_VERSION;
  calculationModelVersion: typeof CALCULATION_MODEL_VERSION;
  country: RegionalConfig["country"];
  currency: SupportedCurrency;
  locale: string;
  timeZone: string;
  calculatedAt: string;
  material: MaterialCostSnapshot;
  energy: {
    powerKw: number;
    printingHours: number;
    energyKwh: number;
    costPerKwh: number;
    energyCost: number;
  };
  machine: {
    machineId?: string;
    name?: string;
    brand?: string;
    model?: string;
    printingHours: number;
    costPerHour: number;
    wearPercent: number;
    hourlyMachineCost: number;
    wearCost: number;
    machineCost: number;
  };
  printingLabor: {
    hourlyRate: number;
    printingHours: number;
    totalCost: number;
  };
  labor: {
    tasks: LaborTaskSnapshot[];
    totalLaborCost: number;
  };
  additional: {
    items: AdditionalLineItemSnapshot[];
    totalAdditionalCost: number;
  };
  failureReserve: {
    percentage: number;
    baseCost: number;
    totalCost: number;
  };
  estimatedProductionCost: number;
  pricing: {
    mode: PricingMode;
    percentage: number;
    mathematicalPrice: number;
    commercialPrice: number;
    mathematicalProfit: number;
    commercialProfit: number;
    resultingMarkupPercent: number;
    resultingMarginPercent: number;
    roundingStrategy: CommercialRoundingStrategy;
  };
};

export class FinancialValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join(" "));
    this.name = "FinancialValidationError";
    this.issues = issues;
  }
}

const validateFiniteNonNegative = (value: number, label: string, issues: string[]) => {
  if (!Number.isFinite(value)) {
    issues.push(`${label} debe ser un número finito.`);
    return;
  }
  if (value < 0) issues.push(`${label} no puede ser negativo.`);
};

const validateInput = (input: CostEngineV2Input) => {
  const issues: string[] = [];

  validateFiniteNonNegative(input.printTimeMinutes, "El tiempo de impresión", issues);
  validateFiniteNonNegative(input.powerWatts, "La potencia", issues);
  validateFiniteNonNegative(input.energyCostPerKwh, "La tarifa de energía", issues);
  validateFiniteNonNegative(input.machineCostPerHour, "La tarifa de máquina", issues);
  validateFiniteNonNegative(input.printingLaborCostPerHour ?? 0, "La mano de obra de impresión", issues);
  validateFiniteNonNegative(input.wearPercent ?? 0, "El porcentaje de desgaste", issues);
  validateFiniteNonNegative(input.failureReservePercent ?? 0, "La reserva por fallos", issues);
  validateFiniteNonNegative(input.material.netGrams, "El peso neto", issues);
  validateFiniteNonNegative(input.material.wastePercent, "El desperdicio planificado", issues);
  validateFiniteNonNegative(input.material.costPerKg, "El costo por kg", issues);
  validateFiniteNonNegative(input.pricing.percentage, "El porcentaje de pricing", issues);

  if (input.pricing.mode !== "markup" && input.pricing.mode !== "target_margin") {
    issues.push("El modo de pricing no es válido.");
  }
  if (!(input.pricing.roundingStrategy in roundingSteps)) {
    issues.push("La estrategia de redondeo comercial no es válida.");
  }

  if (!input.material.materialName.trim()) issues.push("El material debe tener nombre.");
  if (!input.material.costContextDate.trim()) issues.push("El costo del material debe tener fecha de contexto.");
  if (input.pricing.mode === "target_margin" && input.pricing.percentage >= 100) {
    issues.push("El margen objetivo debe ser menor que 100 %.");
  }

  input.laborTasks.forEach((task, index) => {
    if (!task.id.trim()) issues.push(`La tarea laboral ${index + 1} debe tener id.`);
    validateFiniteNonNegative(task.minutes, `Los minutos de la tarea ${index + 1}`, issues);
    validateFiniteNonNegative(task.hourlyRate, `La tarifa de la tarea ${index + 1}`, issues);
  });

  input.additionalItems.forEach((item, index) => {
    if (!item.id.trim()) issues.push(`El adicional ${index + 1} debe tener id.`);
    if (!item.name.trim()) issues.push(`El adicional ${index + 1} debe tener nombre.`);
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      issues.push(`La cantidad del adicional ${index + 1} debe ser mayor que cero.`);
    }
    validateFiniteNonNegative(item.unitCost, `El costo unitario del adicional ${index + 1}`, issues);
  });

  if (issues.length > 0) throw new FinancialValidationError(issues);
};

const roundingSteps: Record<CommercialRoundingStrategy, number> = {
  exact: 0,
  nearest100: 100,
  nearest500: 500,
  nearest1000: 1000,
};

export const roundCommercialPrice = (
  value: number,
  strategy: CommercialRoundingStrategy,
) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new FinancialValidationError(["El precio comercial debe ser un número finito no negativo."]);
  }
  const step = roundingSteps[strategy];
  if (step === undefined) {
    throw new FinancialValidationError(["La estrategia de redondeo comercial no es válida."]);
  }
  return step === 0 ? value : Math.round(value / step) * step;
};

export const calculatePricing = (cost: number, pricing: PricingInput) => {
  const issues: string[] = [];
  validateFiniteNonNegative(cost, "El costo de producción", issues);
  validateFiniteNonNegative(pricing.percentage, "El porcentaje de pricing", issues);
  if (pricing.mode !== "markup" && pricing.mode !== "target_margin") {
    issues.push("El modo de pricing no es válido.");
  }
  if (pricing.mode === "target_margin" && pricing.percentage >= 100) {
    issues.push("El margen objetivo debe ser menor que 100 %.");
  }
  if (issues.length > 0) throw new FinancialValidationError(issues);

  const rate = pricing.percentage / 100;
  const mathematicalPrice =
    pricing.mode === "markup" ? cost * (1 + rate) : cost / (1 - rate);
  const mathematicalProfit = mathematicalPrice - cost;
  const commercialPrice = roundCommercialPrice(mathematicalPrice, pricing.roundingStrategy);
  const commercialProfit = commercialPrice - cost;
  const resultingMarkupPercent = cost > 0 ? (commercialProfit / cost) * 100 : 0;
  const resultingMarginPercent =
    commercialPrice > 0 ? (commercialProfit / commercialPrice) * 100 : 0;

  return {
    mode: pricing.mode,
    percentage: pricing.percentage,
    mathematicalPrice,
    commercialPrice,
    mathematicalProfit,
    commercialProfit,
    resultingMarkupPercent,
    resultingMarginPercent,
    roundingStrategy: pricing.roundingStrategy,
  };
};

export const calculateCostV2 = (input: CostEngineV2Input): CostEngineV2Result => {
  validateInput(input);

  const regional = input.regional ?? COLOMBIA_REGIONAL_CONFIG;
  const printingHours = input.printTimeMinutes / 60;
  const costPerGram = input.material.costPerKg / 1000;
  const wasteGrams = input.material.netGrams * (input.material.wastePercent / 100);
  const billableGrams = input.material.netGrams + wasteGrams;
  const netMaterialCost = input.material.netGrams * costPerGram;
  const wasteMaterialCost = wasteGrams * costPerGram;
  const totalMaterialCost = netMaterialCost + wasteMaterialCost;

  const powerKw = input.powerWatts / 1000;
  const energyKwh = powerKw * printingHours;
  const energyCost = energyKwh * input.energyCostPerKwh;
  const machineCost = printingHours * input.machineCostPerHour;
  const printingLaborCost = printingHours * (input.printingLaborCostPerHour ?? 0);

  const tasks = input.laborTasks.map((task) => ({
    ...task,
    totalCost: (task.minutes / 60) * task.hourlyRate,
  }));
  const totalLaborCost = tasks.reduce((sum, task) => sum + task.totalCost, 0);

  const items = input.additionalItems.map((item) => ({
    ...item,
    totalCost: item.quantity * item.unitCost,
  }));
  const totalAdditionalCost = items.reduce((sum, item) => sum + item.totalCost, 0);

  const wearBaseCost = totalMaterialCost + energyCost + printingLaborCost + totalLaborCost;
  const wearCost = wearBaseCost * ((input.wearPercent ?? 0) / 100);
  const totalMachineCost = machineCost + wearCost;
  const failureReserveBaseCost =
    totalMaterialCost + energyCost + totalMachineCost + printingLaborCost + totalLaborCost + totalAdditionalCost;
  const failureReserveCost =
    failureReserveBaseCost * ((input.failureReservePercent ?? 0) / 100);
  const estimatedProductionCost = failureReserveBaseCost + failureReserveCost;
  const pricing = calculatePricing(estimatedProductionCost, input.pricing);

  return {
    schemaVersion: FINANCIAL_SCHEMA_VERSION,
    calculationModelVersion: CALCULATION_MODEL_VERSION,
    country: regional.country,
    currency: regional.currency,
    locale: regional.locale,
    timeZone: regional.timeZone,
    calculatedAt: new Date().toISOString(),
    material: {
      ...input.material,
      costPerGram,
      wasteGrams,
      billableGrams,
      netMaterialCost,
      wasteMaterialCost,
      totalMaterialCost,
      currency: regional.currency,
    },
    energy: {
      powerKw,
      printingHours,
      energyKwh,
      costPerKwh: input.energyCostPerKwh,
      energyCost,
    },
    machine: {
      ...input.machine,
      printingHours,
      costPerHour: input.machineCostPerHour,
      wearPercent: input.wearPercent ?? 0,
      hourlyMachineCost: machineCost,
      wearCost,
      machineCost: totalMachineCost,
    },
    printingLabor: {
      hourlyRate: input.printingLaborCostPerHour ?? 0,
      printingHours,
      totalCost: printingLaborCost,
    },
    labor: { tasks, totalLaborCost },
    additional: { items, totalAdditionalCost },
    failureReserve: {
      percentage: input.failureReservePercent ?? 0,
      baseCost: failureReserveBaseCost,
      totalCost: failureReserveCost,
    },
    estimatedProductionCost,
    pricing,
  };
};
