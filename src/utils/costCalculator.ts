import { calculatePrintCost } from "../core/calculatePrintCost";

export interface CostInputs {
  timeMinutes: number;
  materialGrams: number;
  assemblyMinutes?: number;
}

export interface CalculationParams {
  filamentCostPerKg: number;
  powerWatts: number;
  energyCostPerKwh: number;
  laborPerHour: number;
  wearPercent: number;
  operationalPercent: number;
  profitPercent: number;
}

export interface CalculationBreakdown {
  materialCost: number;
  energyCost: number;
  laborCost: number;
  wearCost: number;
  operationalCost: number;
  subtotal: number;
  profit: number;
  total: number;
}

export interface CalculationResult {
  timeMinutes: number;
  materialGrams: number;
  breakdown: CalculationBreakdown;
}

export function calculateCost({
  inputs,
  params,
}: {
  inputs: CostInputs;
  params: CalculationParams;
}): CalculationResult {
  const coreBreakdown = calculatePrintCost({
    inputs: {
      timeMinutes: inputs.timeMinutes,
      materialGrams: inputs.materialGrams,
      assemblyMinutes: inputs.assemblyMinutes ?? 0,
    },
    params,
  });
  const breakdown: CalculationBreakdown = {
    materialCost: coreBreakdown.materialCost,
    energyCost: coreBreakdown.energyCost,
    laborCost: coreBreakdown.laborCost,
    wearCost: coreBreakdown.wearCost,
    operationalCost: coreBreakdown.operatingCost,
    subtotal: coreBreakdown.subtotal,
    profit: coreBreakdown.profit,
    total: coreBreakdown.totalFinal,
  };

  return {
    timeMinutes: inputs.timeMinutes,
    materialGrams: inputs.materialGrams,
    breakdown,
  };
}
