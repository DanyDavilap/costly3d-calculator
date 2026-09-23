import { describe, expect, it } from "vitest";
import {
  DEFAULT_MATERIAL_PRICES,
  MATERIAL_PRICES_STORAGE_KEY,
  loadMaterialPrices,
  saveMaterialPrices,
} from "./costProfilePersistence";

describe("material price persistence", () => {
  it("usa valores iniciales cuando todavía no hay configuración", () => {
    const storage = { getItem: () => null };
    expect(loadMaterialPrices(storage)).toEqual(DEFAULT_MATERIAL_PRICES);
  });

  it("guarda y recupera los cuatro precios por kilo", () => {
    let saved = "";
    const prices = { PLA: 50_000, PETG: 60_000, TPU: 90_000, ABS: 55_000 };
    saveMaterialPrices({ setItem: (key, value) => {
      expect(key).toBe(MATERIAL_PRICES_STORAGE_KEY);
      saved = value;
    } }, prices);

    expect(loadMaterialPrices({ getItem: () => saved })).toEqual(prices);
  });
});
