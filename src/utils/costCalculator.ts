export interface CostInputs {
  timeMinutes: number;
  materialGrams: number;
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

const roundCurrency = (value: number) => Math.round(value);

export function calculateCost({
  inputs,
  params,
}: {
  inputs: CostInputs;
  params: CalculationParams;
}): CalculationResult {
  const hours = inputs.timeMinutes / 60;

  const materialCost = (inputs.materialGrams / 1000) * params.filamentCostPerKg;
  const energyCost = (params.powerWatts / 1000) * hours * params.energyCostPerKwh;
  const laborCost = hours * params.laborPerHour;

  const baseCost = materialCost + energyCost + laborCost;
  const wearCost = baseCost * (params.wearPercent / 100);
  const operationalCost = baseCost * (params.operationalPercent / 100);

  const subtotal = baseCost + wearCost + operationalCost;
  const profit = subtotal * (params.profitPercent / 100);
  const total = subtotal + profit;

  const breakdown: CalculationBreakdown = {
    materialCost: roundCurrency(materialCost),
    energyCost: roundCurrency(energyCost),
    laborCost: roundCurrency(laborCost),
    wearCost: roundCurrency(wearCost),
    operationalCost: roundCurrency(operationalCost),
    subtotal: roundCurrency(subtotal),
    profit: roundCurrency(profit),
    total: roundCurrency(total),
  };

  return {
    timeMinutes: inputs.timeMinutes,
    materialGrams: inputs.materialGrams,
    breakdown,
  };
}
