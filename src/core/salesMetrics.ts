import type { Sale } from "../domain/sales";
import type { SupportedCurrency } from "../config/regional";

export type ActualSalesMetrics = {
  saleCount: number;
  unitsSold: number;
  grossRevenue: number;
  discounts: number;
  fees: number;
  shippingCharged: number;
  shippingCost: number;
  taxes: number;
  actualRevenue: number;
  associatedCosts: number;
  actualProfit: number;
  actualMarginPercent: number;
  ignoredCurrencyCount: number;
};

export const calculateActualSalesMetrics = (
  sales: Sale[],
  currency: SupportedCurrency = "COP",
): ActualSalesMetrics => {
  const totals = sales.reduce<ActualSalesMetrics>(
    (totals, sale) => {
      if (sale.currency !== currency) {
        totals.ignoredCurrencyCount += 1;
        return totals;
      }
      totals.saleCount += 1;
      totals.unitsSold += sale.quantity;
      totals.grossRevenue += sale.grossRevenue;
      totals.discounts += sale.discount;
      totals.fees += sale.fees;
      totals.shippingCharged += sale.shippingCharged;
      totals.shippingCost += sale.shippingCost;
      totals.taxes += sale.taxes;
      totals.actualRevenue += sale.netRevenue;
      totals.associatedCosts += sale.costAssociated;
      totals.actualProfit += sale.actualProfit;
      return totals;
    },
    {
      saleCount: 0,
      unitsSold: 0,
      grossRevenue: 0,
      discounts: 0,
      fees: 0,
      shippingCharged: 0,
      shippingCost: 0,
      taxes: 0,
      actualRevenue: 0,
      associatedCosts: 0,
      actualProfit: 0,
      actualMarginPercent: 0,
      ignoredCurrencyCount: 0,
    },
  );
  totals.actualMarginPercent =
    totals.actualRevenue > 0 ? (totals.actualProfit / totals.actualRevenue) * 100 : 0;
  return totals;
};
