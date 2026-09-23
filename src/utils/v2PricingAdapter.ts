import { COLOMBIA_REGIONAL_CONFIG } from "../config/regional";
import {
  FinancialValidationError,
  calculateCostV2,
  type CommercialRoundingStrategy,
  type CostEngineV2Result,
  type AdditionalLineItemInput,
  type LaborTaskInput,
  type MachineSnapshotInput,
  type PricingMode,
} from "../core/financialEngineV2";
import type { PricingBreakdown, PricingInputs } from "./pricingCalculator";

export type DashboardPricingParamsV2 = {
  filamentCostPerKg: number;
  powerWatts: number;
  energyCostPerKwh: number;
  laborPerHour: number;
  machineCostPerHour: number;
  printingLaborCostPerHour?: number;
  wearPercent?: number;
  failureReservePercent?: number;
  wastePercent: number;
  pricingMode: PricingMode;
  pricingPercent: number;
  roundingStrategy: CommercialRoundingStrategy;
};

export type MaterialSelectionSnapshot = {
  materialId?: string;
  spoolId?: string;
  materialName: string;
  costPerKg?: number;
  costContextDate?: string;
  brand?: string;
  materialType?: string;
  color?: string;
  technology?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  purchaseQuantity?: number;
  purchaseUnit?: string;
};

export const parseUiNumber = (value: string | number, label: string) => {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new FinancialValidationError([`${label} debe ser un número finito.`]);
    }
    return value;
  }

  const normalized = value.trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new FinancialValidationError([`${label} debe ser un número válido sin formato monetario.`]);
  }
  return parsed;
};

export const toPricingBreakdown = (snapshot: CostEngineV2Result): PricingBreakdown => ({
  materialCost: snapshot.material.totalMaterialCost,
  energyCost: snapshot.energy.energyCost,
  laborCost: snapshot.printingLabor.totalCost + snapshot.labor.totalLaborCost,
  subtotal: snapshot.estimatedProductionCost,
  wearCost: 0,
  operatingCost: 0,
  totalCost: snapshot.estimatedProductionCost,
  profit: snapshot.pricing.commercialProfit,
  finalPrice: snapshot.pricing.commercialPrice,
  netMaterialCost: snapshot.material.netMaterialCost,
  wasteMaterialCost: snapshot.material.wasteMaterialCost,
  wasteGrams: snapshot.material.wasteGrams,
  billableGrams: snapshot.material.billableGrams,
  energyKwh: snapshot.energy.energyKwh,
  machineCost: snapshot.machine.machineCost,
  printingLaborCost: snapshot.printingLabor.totalCost,
  finishingLaborCost: snapshot.labor.totalLaborCost,
  failureReserveCost: snapshot.failureReserve.totalCost,
  additionalCost: snapshot.additional.totalAdditionalCost,
  mathematicalPrice: snapshot.pricing.mathematicalPrice,
  commercialPrice: snapshot.pricing.commercialPrice,
  resultingMarkupPercent: snapshot.pricing.resultingMarkupPercent,
  resultingMarginPercent: snapshot.pricing.resultingMarginPercent,
});

export const calculateDashboardPricingV2 = ({
  inputs,
  params,
  material,
  machine,
  laborTasks,
  additionalItems,
  calculatedAt = new Date().toISOString(),
}: {
  inputs: PricingInputs;
  params: DashboardPricingParamsV2;
  material?: MaterialSelectionSnapshot;
  machine?: MachineSnapshotInput;
  laborTasks?: Array<Omit<LaborTaskInput, "hourlyRate"> & { hourlyRate?: number }>;
  additionalItems?: AdditionalLineItemInput[];
  calculatedAt?: string;
}) => {
  const materialCostPerKg = material?.costPerKg ?? params.filamentCostPerKg;
  const snapshot = calculateCostV2({
    printTimeMinutes: inputs.timeMinutes,
    powerWatts: params.powerWatts,
    energyCostPerKwh: params.energyCostPerKwh,
    machineCostPerHour: params.machineCostPerHour,
    printingLaborCostPerHour: params.printingLaborCostPerHour,
    wearPercent: params.wearPercent,
    failureReservePercent: params.failureReservePercent,
    material: {
      materialId: material?.materialId,
      spoolId: material?.spoolId,
      materialName: material?.materialName || "Material sin seleccionar",
      brand: material?.brand,
      materialType: material?.materialType,
      color: material?.color,
      technology: material?.technology,
      purchasePrice: material?.purchasePrice,
      purchaseDate: material?.purchaseDate,
      purchaseQuantity: material?.purchaseQuantity,
      purchaseUnit: material?.purchaseUnit,
      netGrams: inputs.materialGrams,
      wastePercent: params.wastePercent,
      costPerKg: materialCostPerKg,
      costContextDate: material?.costContextDate || calculatedAt,
    },
    laborTasks: laborTasks
      ? laborTasks.map((task) => ({
          ...task,
          hourlyRate: task.hourlyRate ?? params.laborPerHour,
        }))
      : inputs.assemblyMinutes > 0 || params.laborPerHour > 0
        ? [
            {
              id: "legacy-assembly-ui",
              type: "assembly",
              name: "Armado / postprocesado",
              minutes: inputs.assemblyMinutes,
              hourlyRate: params.laborPerHour,
            },
          ]
        : [],
    additionalItems: additionalItems ?? [],
    pricing: {
      mode: params.pricingMode,
      percentage: params.pricingPercent,
      roundingStrategy: params.roundingStrategy,
    },
    regional: COLOMBIA_REGIONAL_CONFIG,
    machine,
  });

  return {
    snapshot,
    breakdown: toPricingBreakdown(snapshot),
  };
};
