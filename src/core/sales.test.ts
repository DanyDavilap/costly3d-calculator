import { describe, expect, it } from "vitest";
import { calculateActualSalesMetrics } from "./salesMetrics";
import { registerSale } from "./sales";

describe("registro simple de venta", () => {
  it("calcula ingreso, costo, utilidad y margen real TEST DATA", () => {
    const sale = registerSale({
      id: "sale-1",
      productionId: "production-1",
      date: "2026-09-19",
      quantity: 2,
      unitPrice: 75_000,
      discount: 5_000,
      fees: 2_000,
      shippingCost: 3_000,
      associatedUnitCost: 50_000,
      createdAt: "2026-09-19T00:00:00.000Z",
    });
    expect(sale.grossRevenue).toBe(150_000);
    expect(sale.netRevenue).toBe(140_000);
    expect(sale.costAssociated).toBe(100_000);
    expect(sale.actualProfit).toBe(40_000);
    expect(sale.actualMarginPercent).toBeCloseTo(28.5714285714, 8);
  });

  it("una venta registrada genera ingreso real", () => {
    const sale = registerSale({
      id: "sale-1",
      date: "2026-09-19",
      quantity: 1,
      unitPrice: 75_000,
      associatedUnitCost: 50_000,
    });
    const metrics = calculateActualSalesMetrics([sale]);
    expect(metrics.saleCount).toBe(1);
    expect(metrics.actualRevenue).toBe(75_000);
    expect(metrics.actualProfit).toBe(25_000);
  });

  it("ARS legacy nunca entra en métricas COP ni se agrega con COP", () => {
    const cop = registerSale({
      id: "sale-cop",
      date: "2026-09-19",
      quantity: 1,
      unitPrice: 75_000,
      associatedUnitCost: 50_000,
    });
    const ars = { ...cop, id: "sale-ars", currency: "ARS" as const, netRevenue: 999_999, actualProfit: 999_999 };
    const metrics = calculateActualSalesMetrics([cop, ars], "COP");
    expect(metrics.actualRevenue).toBe(75_000);
    expect(metrics.actualProfit).toBe(25_000);
    expect(metrics.ignoredCurrencyCount).toBe(1);
  });
});

