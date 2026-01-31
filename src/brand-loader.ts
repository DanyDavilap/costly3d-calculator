import type { BrandConfig } from "./types/brand";
import defaultBrandRaw from "./assets/brand/default.json";

const defaultBrand: BrandConfig = {
  ...defaultBrandRaw,
  logo: resolveLogo(defaultBrandRaw.logo),
};

let activeBrand: BrandConfig = defaultBrand;

export function applyBrandTheme(brandKey?: string) {
  const key = brandKey || import.meta.env.VITE_BRAND || "default";
  const brand = resolveBrand(key);
  activeBrand = brand;

  const root = document.documentElement;
  Object.entries(brand.colors).forEach(([token, value]) => {
    root.style.setProperty(`--${token}`, value);
  });

  if (brand.logo) {
    root.style.setProperty("--brand-logo", `url(${brand.logo})`);
  }
  return brand;
}

function resolveBrand(key: string): BrandConfig {
  return defaultBrand;
}

export function getActiveBrand() {
  return activeBrand;
}

function resolveLogo(fileName: string) {
  return new URL(`./assets/brand/${fileName}`, import.meta.url).href;
}
