export type ProfitabilityRecordInput = {
  id: string;
  date: string;
  productName?: string;
  name?: string;
  category?: string;
  quantity?: number;
  total?: number;
  breakdown?: {
    totalCost?: number;
    finalPrice?: number;
  };
};

export type ProfitabilityEntry = {
  id: string;
  date: string;
  productName: string;
  category: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  timestamp: number;
};

export type ProfitabilityProduct = {
  key: string;
  productName: string;
  category: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
};

export type ProfitabilitySummary = {
  entries: ProfitabilityEntry[];
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  averageMargin: number;
  mostProfitable: ProfitabilityProduct | null;
  topByProfit: ProfitabilityProduct[];
  topByMargin: ProfitabilityProduct[];
  recentQuotes: ProfitabilityEntry[];
};

const parseRecordDate = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return null;
  const parts = normalized.split(/[\/\-]/);
  if (parts.length === 3) {
    const [dayPart, monthPart, yearPart] = parts;
    const day = Number.parseInt(dayPart, 10);
    const month = Number.parseInt(monthPart, 10);
    const year = Number.parseInt(yearPart, 10);
    if (Number.isFinite(day) && Number.isFinite(month) && Number.isFinite(year)) {
      return new Date(year, Math.max(0, month - 1), day);
    }
  }
  const fallback = new Date(normalized);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const safeNumber = (value: number | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

export const calculateProfitability = (records: ProfitabilityRecordInput[]): ProfitabilitySummary => {
  const entries: ProfitabilityEntry[] = records.map((record) => {
    const productName = record.productName || record.name || "Producto";
    const category = record.category || "General";
    const quantity = Number.isFinite(record.quantity) ? Math.max(1, record.quantity ?? 1) : 1;
    const finalPrice = safeNumber(record.total ?? record.breakdown?.finalPrice);
    const totalCost = safeNumber(record.breakdown?.totalCost);
    const revenue = finalPrice * quantity;
    const cost = totalCost * quantity;
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const parsedDate = parseRecordDate(record.date);
    const timestamp = parsedDate ? parsedDate.getTime() : 0;

    return {
      id: record.id,
      date: record.date,
      productName,
      category,
      revenue,
      cost,
      profit,
      margin,
      timestamp,
    };
  });

  const totalRevenue = entries.reduce((sum, entry) => sum + entry.revenue, 0);
  const totalCost = entries.reduce((sum, entry) => sum + entry.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const byProduct = entries.reduce<Record<string, ProfitabilityProduct>>((acc, entry) => {
    const key = `${entry.category}::${entry.productName}`;
    const current = acc[key] ?? {
      key,
      productName: entry.productName,
      category: entry.category,
      revenue: 0,
      cost: 0,
      profit: 0,
      margin: 0,
    };
    current.revenue += entry.revenue;
    current.cost += entry.cost;
    current.profit = current.revenue - current.cost;
    current.margin = current.revenue > 0 ? (current.profit / current.revenue) * 100 : 0;
    acc[key] = current;
    return acc;
  }, {});

  const products = Object.values(byProduct);
  const topByProfit = [...products].sort((a, b) => b.profit - a.profit).slice(0, 5);
  const topByMargin = [...products].sort((a, b) => b.margin - a.margin).slice(0, 5);
  const mostProfitable = topByProfit[0] ?? null;

  const recentQuotes = [...entries].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  return {
    entries,
    totalRevenue,
    totalCost,
    totalProfit,
    averageMargin,
    mostProfitable,
    topByProfit,
    topByMargin,
    recentQuotes,
  };
};
