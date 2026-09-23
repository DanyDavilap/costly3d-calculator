import type { Sale } from "../domain/sales";

export const SALES_STORAGE_KEY = "salesV1";

export const loadSales = (storage: Pick<Storage, "getItem">): Sale[] => {
  const saved = storage.getItem(SALES_STORAGE_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved) as unknown;
    return Array.isArray(parsed) ? (parsed as Sale[]) : [];
  } catch {
    return [];
  }
};

export const saveSales = (storage: Pick<Storage, "setItem">, sales: Sale[]) => {
  storage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales));
};

