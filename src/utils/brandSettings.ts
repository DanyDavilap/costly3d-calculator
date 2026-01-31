import { DEFAULT_BRAND, type BrandSettings } from "./pdfTheme";

export const BRAND_STORAGE_KEY = "costly3d_brand";

export const loadBrandSettings = (): BrandSettings => {
  if (typeof window === "undefined") return DEFAULT_BRAND;
  const saved = localStorage.getItem(BRAND_STORAGE_KEY);
  if (!saved) return DEFAULT_BRAND;
  try {
    const parsed = JSON.parse(saved) as Partial<BrandSettings>;
    return {
      ...DEFAULT_BRAND,
      ...parsed,
    };
  } catch (error) {
    return DEFAULT_BRAND;
  }
};

export const saveBrandSettings = (brand: BrandSettings) => {
  localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(brand));
};
