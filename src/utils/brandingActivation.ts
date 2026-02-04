import { isDev } from "./proPermissions";
import type { BrandSettings } from "./pdfTheme";
import type { ReporteExportData } from "./reporteExports";

export const DEV_MODE_FORZADO = isDev();

export const BRANDING_ACTIVO = DEV_MODE_FORZADO;

export type BrandingInfo = Pick<
  BrandSettings,
  "name" | "logoDataUrl" | "primaryColor" | "footerText" | "instagram" | "whatsapp" | "website"
>;

export const activarBranding = (
  reporteData: ReporteExportData,
  brand: BrandSettings,
  allowBranding: boolean = BRANDING_ACTIVO,
): ReporteExportData => {
  const isEnabled = allowBranding || BRANDING_ACTIVO;
  if (!isEnabled) return reporteData;
  return {
    ...reporteData,
    branding: {
      name: brand.name,
      logoDataUrl: brand.logoDataUrl,
      primaryColor: brand.primaryColor,
      footerText: brand.footerText,
      instagram: brand.instagram,
      whatsapp: brand.whatsapp,
      website: brand.website,
    },
  };
};
