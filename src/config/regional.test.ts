import { describe, expect, it } from "vitest";
import {
  COLOMBIA_REGIONAL_CONFIG,
  LEGACY_ARGENTINA_REGIONAL_CONFIG,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
} from "./regional";

describe("regional config", () => {
  it("define Colombia como contexto nuevo único", () => {
    expect(COLOMBIA_REGIONAL_CONFIG).toMatchObject({
      country: "CO",
      currency: "COP",
      locale: "es-CO",
      timeZone: "America/Bogota",
    });
  });

  it("formatea COP sin centavos", () => {
    expect(formatMoney(32_000)).toBe("$ 32.000");
  });

  it("identifica históricos en ARS sin presentarlos como COP", () => {
    const formatted = formatMoney(32_000, {
      config: LEGACY_ARGENTINA_REGIONAL_CONFIG,
      includeCurrencyCode: true,
    });
    expect(formatted).toContain("ARS");
    expect(formatted).not.toContain("COP");
  });

  it("centraliza número, porcentaje y fecha en America/Bogota", () => {
    expect(formatNumber(1_234.5, { maximumFractionDigits: 1 })).toBe("1.234,5");
    expect(formatPercent(33.333, { maximumFractionDigits: 2 })).toBe("33,33%");
    expect(formatDate("2026-09-20T02:00:00.000Z")).toBe("19/09/2026");
  });
});
