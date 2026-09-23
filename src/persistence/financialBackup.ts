export const FINANCIAL_STORAGE_KEYS = [
  "calculatorBaseParams",
  "calculatorBaseParamsV2",
  "toyRecords",
  "materialStock",
  "projects",
  "marketingProfile",
  "machinesV2",
  "businessEconomicSettingsV2",
  "costlyMaterialPricesV1",
  "salesV1",
] as const;

export type FinancialStorageKey = (typeof FINANCIAL_STORAGE_KEYS)[number];

export type FinancialBackup = {
  backupVersion: 1;
  createdAt: string;
  source: "costly3d-localStorage";
  entries: Record<FinancialStorageKey, string | null>;
};

type StorageReader = Pick<Storage, "getItem">;

export const createFinancialBackup = (
  storage: StorageReader,
  createdAt = new Date().toISOString(),
): FinancialBackup => {
  const entries = Object.fromEntries(
    FINANCIAL_STORAGE_KEYS.map((key) => [key, storage.getItem(key)]),
  ) as Record<FinancialStorageKey, string | null>;

  return {
    backupVersion: 1,
    createdAt,
    source: "costly3d-localStorage",
    entries,
  };
};

export const downloadFinancialBackup = (storage: StorageReader = window.localStorage) => {
  const backup = createFinancialBackup(storage);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `costly3d-backup-${backup.createdAt.slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  return backup;
};
