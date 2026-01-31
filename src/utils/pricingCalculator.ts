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

const round2 = (value: number) => {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Number(rounded.toFixed(2));
};

const minutesToHours = (minutes: number) => minutes / 60;
const gramsToKg = (grams: number) => grams / 1000;

export function pricingCalculator({
  inputs,
  params,
}: {
  inputs: PricingInputs;
  params: PricingParams;
}): PricingBreakdown {
  const printHours = minutesToHours(inputs.timeMinutes);
  const assemblyHours = minutesToHours(inputs.assemblyMinutes);
  const materialKg = gramsToKg(inputs.materialGrams);

  const materialCost = materialKg * params.filamentCostPerKg;
  const energyCost = (params.powerWatts / 1000) * printHours * params.energyCostPerKwh;
  const laborCost = assemblyHours * params.laborPerHour;

  const baseCost = materialCost + energyCost + laborCost;
  const wearCost = baseCost * (params.wearPercent / 100);
  const operatingCost = baseCost * (params.operationalPercent / 100);

  const subtotal = baseCost + wearCost + operatingCost;
  const totalCost = subtotal;
  const profit = totalCost * (params.profitPercent / 100);
  const finalPrice = totalCost + profit;

  return {
    materialCost: round2(materialCost),
    energyCost: round2(energyCost),
    laborCost: round2(laborCost),
    subtotal: round2(subtotal),
    wearCost: round2(wearCost),
    operatingCost: round2(operatingCost),
    totalCost: round2(totalCost),
    profit: round2(profit),
    finalPrice: round2(finalPrice),
  };
}
