import {
  FinancialValidationError,
  calculateCostV2,
  type CostEngineV2Input,
  type CostEngineV2Result,
} from "./financialEngineV2";

export type QuoteLotTotals = {
  quantity: number;
  materialCost: number;
  energyCost: number;
  machineCost: number;
  laborCost: number;
  printingLaborCost: number;
  finishingLaborCost: number;
  failureReserveCost: number;
  additionalCost: number;
  estimatedProductionCost: number;
  mathematicalPrice: number;
  commercialPrice: number;
  commercialProfit: number;
};

export type QuoteCalculationV2 = {
  quantity: number;
  unit: CostEngineV2Result;
  lot: QuoteLotTotals;
};

export const calculateLotTotals = (
  unit: CostEngineV2Result,
  quantity: number,
): QuoteLotTotals => {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new FinancialValidationError(["La cantidad del lote debe ser un entero mayor que cero."]);
  }
  const scale = (value: number) => value * quantity;
  return {
    quantity,
    materialCost: scale(unit.material.totalMaterialCost),
    energyCost: scale(unit.energy.energyCost),
    machineCost: scale(unit.machine.machineCost),
    laborCost: scale((unit.printingLabor?.totalCost ?? 0) + unit.labor.totalLaborCost),
    printingLaborCost: scale(unit.printingLabor?.totalCost ?? 0),
    finishingLaborCost: scale(unit.labor.totalLaborCost),
    failureReserveCost: scale(unit.failureReserve?.totalCost ?? 0),
    additionalCost: scale(unit.additional.totalAdditionalCost),
    estimatedProductionCost: scale(unit.estimatedProductionCost),
    mathematicalPrice: scale(unit.pricing.mathematicalPrice),
    commercialPrice: scale(unit.pricing.commercialPrice),
    commercialProfit: scale(unit.pricing.commercialProfit),
  };
};

export const calculateQuoteV2 = (
  input: CostEngineV2Input,
  quantity: number,
): QuoteCalculationV2 => {
  const unit = calculateCostV2(input);
  return {
    quantity,
    unit,
    lot: calculateLotTotals(unit, quantity),
  };
};
