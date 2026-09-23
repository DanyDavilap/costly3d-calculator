/**
 * Seguimiento preparado para producción real. Estos datos no se calculan desde
 * la fórmula legacy de fallas y pueden completarse cuando exista captura real.
 */
export type ProductionMaterialTracking = {
  plannedMaterialGrams: number;
  actualMaterialConsumedGrams?: number;
  failureProgressPercent?: number;
};

export type ProductionActualCost = {
  materialTracking: ProductionMaterialTracking;
  actualProductionCost?: number;
  currency: "COP";
};

/** Vínculo mínimo entre una cotización inmutable y su ejecución posterior. */
export type ProductionOrderLink = {
  productionOrderId: string;
  sourceQuoteId: string;
  createdAt: string;
  inventoryStatus: "not_reserved" | "reserved" | "consumed";
  plannedMaterialGrams: number;
  actualMaterialConsumedGrams?: number;
  estimatedProductionCost: number;
  actualProductionCost?: number;
  currency: "COP";
};
