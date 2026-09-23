import { describe, expect, it } from "vitest";
import { calculateActualSalesMetrics } from "./salesMetrics";
import { calculateMonthlyMetrics } from "../utils/monthlyMetrics";

describe("actual sales metrics", () => {
  it("una producción finalizada no crea una venta ni ingreso real", () => {
    const productionMetrics = calculateMonthlyMetrics([
      {
        id: "production-1",
        date: "19/09/2026",
        status: "finalizada_ok",
        quantity: 1,
        total: 150_000,
        breakdown: { totalCost: 100_000, finalPrice: 150_000 },
      },
    ]);

    expect(productionMetrics.totals.ingresosEstimadosTotal).toBe(150_000);
    expect(productionMetrics.totals.ingresosRealesTotal).toBe(0);
    expect(productionMetrics.totals.hasActualSales).toBe(false);
  });

  it("sin ventas retorna cero / sin datos", () => {
    expect(calculateActualSalesMetrics([])).toEqual({
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
    });
  });

  it("no mezcla producciones COP y registros legacy ARS", () => {
    const metrics = calculateMonthlyMetrics([
      {
        id: "cop-production",
        date: "19/09/2026",
        status: "finalizada_ok",
        currency: "COP",
        quantity: 2,
        total: 20_000,
        breakdown: { totalCost: 12_000, finalPrice: 20_000 },
      },
      {
        id: "ars-legacy",
        date: "19/09/2026",
        status: "finalizada_ok",
        currency: "ARS",
        quantity: 99,
        total: 999_999,
        breakdown: { totalCost: 1, finalPrice: 999_999 },
      },
    ]);

    expect(metrics.totals.ingresosEstimadosTotal).toBe(40_000);
    expect(metrics.totals.okCount).toBe(1);
  });
});
