import type { jsPDF } from "jspdf";

export type BrandSettings = {
  name: string;
  logoDataUrl: string;
  primaryColor: string;
  footerText: string;
};

export type PdfTheme = {
  marginX: number;
  marginY: number;
  lineGap: number;
  titleSize: number;
  subtitleSize: number;
  textSize: number;
  totalSize: number;
  accent: { r: number; g: number; b: number };
};

export const DEFAULT_BRAND: BrandSettings = {
  name: "Costly3D",
  logoDataUrl: "",
  primaryColor: "#5b9dff",
  footerText: "Cotización generada con Costly3D",
};

const clampColor = (value: number) => Math.min(255, Math.max(0, value));

const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "").trim();
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some((val) => Number.isNaN(val))) return null;
  return { r: clampColor(r), g: clampColor(g), b: clampColor(b) };
};

export const createPdfTheme = (brand: BrandSettings): PdfTheme => {
  const accent = hexToRgb(brand.primaryColor) ?? { r: 91, g: 157, b: 255 };
  return {
    marginX: 16,
    marginY: 18,
    lineGap: 7,
    titleSize: 18,
    subtitleSize: 11,
    textSize: 11,
    totalSize: 18,
    accent,
  };
};

export const formatMoney = (value: number, currency: string = "ARS") =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(value);

export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);

const getImageFormat = (dataUrl: string) => {
  if (dataUrl.startsWith("data:image/jpeg")) return "JPEG";
  if (dataUrl.startsWith("data:image/jpg")) return "JPG";
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  return "PNG";
};

export const renderHeader = (
  doc: jsPDF,
  brand: BrandSettings,
  theme: PdfTheme,
  title: string,
  subtitle?: string,
) => {
  const { marginX, marginY, accent, titleSize, subtitleSize } = theme;
  const logoSize = 16;
  let textX = marginX;
  const brandLabel = brand.name || DEFAULT_BRAND.name;
  const hasLogo = Boolean(brand.logoDataUrl);

  if (hasLogo) {
    doc.addImage(brand.logoDataUrl, getImageFormat(brand.logoDataUrl), marginX, marginY - 2, logoSize, logoSize);
    textX = marginX + logoSize + 6;
  } else {
    doc.setTextColor(accent.r, accent.g, accent.b);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(subtitleSize);
    doc.text(brandLabel, marginX, marginY + 8);
    textX = marginX;
  }

  if (hasLogo) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(subtitleSize);
    doc.setTextColor(100, 116, 139);
    doc.text(brandLabel, textX, marginY + 4);
  }

  doc.setTextColor(accent.r, accent.g, accent.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(titleSize);
  doc.text(title, textX, marginY + 12);

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(subtitleSize);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, textX, marginY + 20);
  }

  const lineY = marginY + (subtitle ? 26 : 22);
  doc.setDrawColor(accent.r, accent.g, accent.b);
  doc.setLineWidth(0.4);
  doc.line(marginX, lineY, doc.internal.pageSize.getWidth() - marginX, lineY);
  return lineY + 8;
};

export const renderFooter = (doc: jsPDF, brand: BrandSettings, theme: PdfTheme) => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const footer = brand.footerText || DEFAULT_BRAND.footerText;
  doc.text(footer, theme.marginX, doc.internal.pageSize.getHeight() - 12);
};
