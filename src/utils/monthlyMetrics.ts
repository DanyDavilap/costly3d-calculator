import { calculateActualSalesMetrics } from "../core/salesMetrics";
import type { SupportedCurrency } from "../config/regional";
import type { Sale } from "../domain/sales";

export type MonthlyMetricsRecord = {
  id: string;
  date: string;
  status: string;
  currency?: SupportedCurrency;
  quantity?: number;
  total?: number;
  productName?: string;
  name?: string;
  category?: string;
  inputs?: {
    materialGrams?: number;
  };
  materialGramsUsed?: number;
  breakdown?: {
    totalCost?: number;
    finalPrice?: number;
  };
  failure?: {
    gramsLost?: number;
    lostGrams?: number;
    lostCost?: number;
    materialCostLost?: number;
    energyCostLost?: number;
    laborCostLost?: number;
    laborLost?: number;
  } | null;
};

export type MonthlyMetricsItem = {
  id: string;
  date: string;
  status: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  revenueItem: number;
  costSalesItem: number;
  failureCostItem: number;
  costTotalItem: number;
  netProfitItem: number;
  gramsUsed: number;
  gramsLost: number;
  isOk: boolean;
  isFailed: boolean;
};

export type MonthlyMetricsTotals = {
  /** @deprecated Compatibilidad v1: equivale a ingresosEstimadosTotal. */
  ingresosTotal: number;
  ingresosEstimadosTotal: number;
  ingresosRealesTotal: number;
  hasActualSales: boolean;
  ventasRegistradas: number;
  unidadesVendidas: number;
  costosVentasRealesTotal: number;
  utilidadReal: number;
  margenRealPct: number;
  costosVentasTotal: number;
  perdidasFallasTotal: number;
  rentabilidadEstimada: number;
  margenEstimadoPct: number;
  /** @deprecated Compatibilidad v1: equivale a rentabilidadEstimada. */
  rentabilidadNetaReal: number;
  /** @deprecated Compatibilidad v1: equivale a margenEstimadoPct. */
  margenNetoRealPct: number;
  gramosConsumidos: number;
  gramosDesperdiciados: number;
  tasaFallas: number;
  okCount: number;
  failedCount: number;
};

export type MonthlyProductMetric = {
  key: string;
  name: string;
  category: string;
  revenue: number;
  units: number;
  cost: number;
  profit: number;
  marginPct: number;
};

export type MonthlyMetricsResult = {
  items: MonthlyMetricsItem[];
  totals: MonthlyMetricsTotals;
  products: MonthlyProductMetric[];
};

export type MonthlyReportSummary = {
  ingresos: {
    total: number;
    productos: {
      name: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      costTotal: number;
    }[];
    chart: { labels: string[]; values: number[] };
  };
  perdidas: {
    total: number;
    filamentoDesperdiciadoGramos: number;
    piezasFallidas: number;
    costos: number;
    chart: { lossPct: number };
  };
  consumoFilamento: {
    totalGramos: number;
    porTipo: { material: string; grams: number }[];
    chart: { labels: string[]; values: number[] };
  };
  topProductos: {
    items: { name: string; ingresos: number; unidades: number; margenPct: number }[];
    chart: { labels: string[]; values: number[] };
  };
  rentabilidadNeta: {
    neto: number;
    margenPct: number;
  };
  insights: string[];
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const resolveQuantity = (record: MonthlyMetricsRecord) => {
  const quantity = record.quantity;
  return isFiniteNumber(quantity) && quantity > 0 ? quantity : 1;
};

const resolveUnitPrice = (record: MonthlyMetricsRecord) => {
  if (isFiniteNumber(record.total)) return record.total;
  if (isFiniteNumber(record.breakdown?.finalPrice)) return record.breakdown.finalPrice;
  return 0;
};

const resolveCostPerUnit = (record: MonthlyMetricsRecord) => {
  if (isFiniteNumber(record.breakdown?.totalCost)) return record.breakdown.totalCost;
  return 0;
};

const resolveGramsUsed = (record: MonthlyMetricsRecord, quantity: number) => {
  if (isFiniteNumber(record.materialGramsUsed) && record.materialGramsUsed > 0) {
    return record.materialGramsUsed;
  }
  if (isFiniteNumber(record.inputs?.materialGrams) && record.inputs.materialGrams > 0) {
    return record.inputs.materialGrams * quantity;
  }
  return 0;
};

const resolveGramsLost = (record: MonthlyMetricsRecord, gramsUsed: number) => {
  if (isFiniteNumber(record.failure?.lostGrams) && record.failure.lostGrams > 0) {
    return record.failure.lostGrams;
  }
  if (isFiniteNumber(record.failure?.gramsLost) && record.failure.gramsLost > 0) {
    return record.failure.gramsLost;
  }
  return gramsUsed;
};

const resolveFailureCost = (record: MonthlyMetricsRecord, quantity: number) => {
  const failure = record.failure ?? undefined;
  if (failure && isFiniteNumber(failure.lostCost)) {
    return failure.lostCost;
  }
  const materialLost = failure && isFiniteNumber(failure.materialCostLost) ? failure.materialCostLost : null;
  const energyLost = failure && isFiniteNumber(failure.energyCostLost) ? failure.energyCostLost : null;
  const laborLost =
    failure && isFiniteNumber(failure.laborCostLost)
      ? failure.laborCostLost
      : failure && isFiniteNumber(failure.laborLost)
        ? failure.laborLost
        : 0;

  if (materialLost !== null && energyLost !== null) {
    return materialLost + energyLost + (isFiniteNumber(laborLost) ? laborLost : 0);
  }

  const costPerUnit = resolveCostPerUnit(record);
  return costPerUnit * quantity;
};

export const calculateMonthlyMetrics = (
  records: MonthlyMetricsRecord[],
  sales: Sale[] = [],
): MonthlyMetricsResult => {
  const items: MonthlyMetricsItem[] = [];
  const productMap = new Map<string, MonthlyProductMetric>();

  records
    .filter(
      (record) =>
        (!record.currency || record.currency === "COP") &&
        (record.status === "finalizada_ok" || record.status === "finalizada_fallida"),
    )
    .forEach((record) => {
      const isOk = record.status === "finalizada_ok";
      const isFailed = record.status === "finalizada_fallida";
      const quantity = resolveQuantity(record);
      const unitPrice = resolveUnitPrice(record);
      const costPerUnit = resolveCostPerUnit(record);
      const revenueItem = isOk ? unitPrice * quantity : 0;
      const costSalesItem = isOk ? costPerUnit * quantity : 0;
      const failureCostItem = isFailed ? resolveFailureCost(record, quantity) : 0;
      const costTotalItem = costSalesItem + failureCostItem;
      const netProfitItem = revenueItem - costTotalItem;
      const gramsUsed = isOk || isFailed ? resolveGramsUsed(record, quantity) : 0;
      const gramsLost = isFailed ? resolveGramsLost(record, gramsUsed) : 0;
      const productName = record.productName || record.name || "Producto";
      const category = record.category || "General";

      const item: MonthlyMetricsItem = {
        id: record.id,
        date: record.date,
        status: record.status,
        productName,
        category,
        quantity,
        unitPrice,
        revenueItem,
        costSalesItem,
        failureCostItem,
        costTotalItem,
        netProfitItem,
        gramsUsed,
        gramsLost,
        isOk,
        isFailed,
      };
      items.push(item);

      const productKey = `${category}::${productName}`;
      const current = productMap.get(productKey) ?? {
        key: productKey,
        name: productName,
        category,
        revenue: 0,
        units: 0,
        cost: 0,
        profit: 0,
        marginPct: 0,
      };
      current.revenue += revenueItem;
      current.cost += costTotalItem;
      if (isOk) {
        current.units += quantity;
      }
      productMap.set(productKey, current);
    });

  const products = Array.from(productMap.values()).map((item) => {
    const profit = item.revenue - item.cost;
    const marginPct = item.revenue > 0 ? (profit / item.revenue) * 100 : 0;
    return {
      ...item,
      profit,
      marginPct,
    };
  });

  const totals = items.reduce<MonthlyMetricsTotals>(
    (acc, item) => {
      acc.ingresosTotal += item.revenueItem;
      acc.costosVentasTotal += item.costSalesItem;
      acc.perdidasFallasTotal += item.failureCostItem;
      acc.gramosConsumidos += item.gramsUsed;
      acc.gramosDesperdiciados += item.gramsLost;
      if (item.isOk) acc.okCount += 1;
      if (item.isFailed) acc.failedCount += 1;
      return acc;
    },
    {
      ingresosTotal: 0,
      ingresosEstimadosTotal: 0,
      ingresosRealesTotal: 0,
      hasActualSales: false,
      ventasRegistradas: 0,
      unidadesVendidas: 0,
      costosVentasRealesTotal: 0,
      utilidadReal: 0,
      margenRealPct: 0,
      costosVentasTotal: 0,
      perdidasFallasTotal: 0,
      rentabilidadEstimada: 0,
      margenEstimadoPct: 0,
      rentabilidadNetaReal: 0,
      margenNetoRealPct: 0,
      gramosConsumidos: 0,
      gramosDesperdiciados: 0,
      tasaFallas: 0,
      okCount: 0,
      failedCount: 0,
    },
  );

  totals.ingresosEstimadosTotal = totals.ingresosTotal;
  const actualSales = calculateActualSalesMetrics(sales);
  totals.ingresosRealesTotal = actualSales.actualRevenue;
  totals.hasActualSales = actualSales.saleCount > 0;
  totals.ventasRegistradas = actualSales.saleCount;
  totals.unidadesVendidas = actualSales.unitsSold;
  totals.costosVentasRealesTotal = actualSales.associatedCosts;
  totals.utilidadReal = actualSales.actualProfit;
  totals.margenRealPct = actualSales.actualMarginPercent;
  totals.rentabilidadEstimada =
    totals.ingresosTotal - totals.costosVentasTotal - totals.perdidasFallasTotal;
  totals.margenEstimadoPct =
    totals.ingresosTotal > 0 ? (totals.rentabilidadEstimada / totals.ingresosTotal) * 100 : 0;
  totals.rentabilidadNetaReal = totals.rentabilidadEstimada;
  totals.margenNetoRealPct = totals.margenEstimadoPct;
  const attempts = totals.okCount + totals.failedCount;
  totals.tasaFallas = attempts > 0 ? (totals.failedCount / attempts) * 100 : 0;

  return { items, totals, products };
};
