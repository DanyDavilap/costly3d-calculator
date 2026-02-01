export interface PrintCostInputs {
  timeMinutes: number;
  materialGrams: number;
  assemblyMinutes: number;
}

export interface PrintCostParams {
  filamentCostPerKg: number;
  powerWatts: number;
  energyCostPerKwh: number;
  laborPerHour: number;
  wearPercent: number;
  operationalPercent: number;
  profitPercent: number;
}

export interface PrintCostBreakdown {
  materialCost: number;
  energyCost: number;
  laborCost: number;
  baseCost: number;
  wearCost: number;
  operatingCost: number;
  subtotal: number;
  profit: number;
  totalFinal: number;
  suggestedPrice: number;
}

const roundCurrency = (value: number) => {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Number(rounded.toFixed(2));
};

const minutesToHours = (minutes: number) => minutes / 60;
const gramsToKg = (grams: number) => grams / 1000;

export function calculatePrintCost({
  inputs,
  params,
}: {
  inputs: PrintCostInputs;
  params: PrintCostParams;
}): PrintCostBreakdown {
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
  const profit = subtotal * (params.profitPercent / 100);
  const totalFinal = subtotal + profit;

  return {
    materialCost: roundCurrency(materialCost),
    energyCost: roundCurrency(energyCost),
    laborCost: roundCurrency(laborCost),
    baseCost: roundCurrency(baseCost),
    wearCost: roundCurrency(wearCost),
    operatingCost: roundCurrency(operatingCost),
    subtotal: roundCurrency(subtotal),
    profit: roundCurrency(profit),
    totalFinal: roundCurrency(totalFinal),
    suggestedPrice: roundCurrency(totalFinal),
  };
}
