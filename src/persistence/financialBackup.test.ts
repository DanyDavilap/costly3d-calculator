import { describe, expect, it } from "vitest";
import { FINANCIAL_STORAGE_KEYS, createFinancialBackup } from "./financialBackup";

describe("financial backup", () => {
  it("exporta todas las claves relevantes sin borrar ni transformar", () => {
    const values = new Map<string, string>([
      ["calculatorBaseParams", '{"filamentCostPerKg":30000}'],
      ["toyRecords", '[{"id":"legacy"}]'],
    ]);
    const reads: string[] = [];
    const storage = {
      getItem(key: string) {
        reads.push(key);
        return values.get(key) ?? null;
      },
    };

    const backup = createFinancialBackup(storage, "2026-09-19T12:00:00.000Z");

    expect(reads).toEqual(FINANCIAL_STORAGE_KEYS);
    expect(backup.entries.calculatorBaseParams).toBe('{"filamentCostPerKg":30000}');
    expect(backup.entries.toyRecords).toBe('[{"id":"legacy"}]');
    expect(backup.entries.materialStock).toBeNull();
    expect(values.get("toyRecords")).toBe('[{"id":"legacy"}]');
  });
});

