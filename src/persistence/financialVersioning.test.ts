import { describe, expect, it } from "vitest";
import {
  createV2FinancialMetadata,
  isLegacyFinancialRecord,
  isV2FinancialRecord,
  withFinancialVersionForRead,
} from "./financialVersioning";

describe("financial versioning", () => {
  it("etiqueta registros sin metadata como legacy-ARS sin mutarlos", () => {
    const source = { id: "legacy-1", total: 30_000 };
    const result = withFinancialVersionForRead(source);

    expect(result).toMatchObject({
      id: "legacy-1",
      total: 30_000,
      schemaVersion: 1,
      calculationModelVersion: "legacy-v1",
      currency: "ARS",
      regionalTag: "legacy-ARS",
    });
    expect(source).toEqual({ id: "legacy-1", total: 30_000 });
    expect(isLegacyFinancialRecord(result)).toBe(true);
  });

  it("mantiene metadata explícita para datos nuevos COP", () => {
    const result = withFinancialVersionForRead({
      id: "v2-1",
      ...createV2FinancialMetadata(),
    });

    expect(result.currency).toBe("COP");
    expect(result.calculationModelVersion).toBe("costly3d-v2");
    expect(isV2FinancialRecord(result)).toBe(true);
  });
});

