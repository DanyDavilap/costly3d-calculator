import { calculatePrintCost } from "../core/calculatePrintCost";

export interface PricingInputs {
  timeMinutes: number;
  materialGrams: number;
  assemblyMinutes: number;
}

export interface PricingParams {
  filamentCostPerKg: number;
  powerWatts: number;
  energyCostPerKwh: number;
  laborPerHour: number;
  wearPercent: number;
  operationalPercent: number;
  profitPercent: number;
}

export interface PricingBreakdown {
  materialCost: number;
  energyCost: number;
  laborCost: number;
  subtotal: number;
  wearCost: number;
  operatingCost: number;
  totalCost: number;
  profit: number;
  finalPrice: number;
}

export function pricingCalculator({
  inputs,
  params,
}: {
  inputs: PricingInputs;
  params: PricingParams;
}): PricingBreakdown {
  const breakdown = calculatePrintCost({ inputs, params });

  return {
    materialCost: breakdown.materialCost,
    energyCost: breakdown.energyCost,
    laborCost: breakdown.laborCost,
    subtotal: breakdown.subtotal,
    wearCost: breakdown.wearCost,
    operatingCost: breakdown.operatingCost,
    totalCost: breakdown.subtotal,
    profit: breakdown.profit,
    finalPrice: breakdown.totalFinal,
  };
}
