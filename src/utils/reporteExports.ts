import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import type { BrandingInfo } from "./brandingActivation";
import type { ReporteMensual } from "./reporteMensual";

export type ReporteDetalleRow = {
  fecha: string;
  producto: string;
  categoria: string;
  estado: string;
  tiempoMin: number;
  materialGrams: number;
  costoTotal: number;
  precioVenta: number;
  ganancia: number;
  material: string;
  color: string;
  marca: string;
  gramosUsados: number;
  gramosPerdidos: number;
  costoMaterialPerdido: number;
  costoEnergiaPerdida: number;
  notaFallo: string;
};

export type ReporteConsumoRow = {
  material: string;
  color: string;
  marca: string;
  gramos: number;
};

export type ReporteExportData = {
  periodoLabel: string;
  periodoKey: string;
  ingresos: ReporteMensual["ingresos"];
  perdidas: ReporteMensual["perdidas"];
  consumoFilamento: ReporteMensual["consumoFilamento"];
  topProductos: ReporteMensual["topProductos"];
  rentabilidadNeta: ReporteMensual["rentabilidadNeta"];
  insights: ReporteMensual["insights"];
  detalle: ReporteDetalleRow[];
  consumoDetalle: ReporteConsumoRow[];
  branding?: BrandingInfo;
};

export const exportarExcel = (reporteData: ReporteExportData) => {
  if (!reporteData || reporteData.detalle.length === 0) {
    throw new Error("NO_DATA");
  }

  const workbook = XLSX.utils.book_new();

  const resumenRows: (string | number)[][] = [];
  if (reporteData.branding) {
    resumenRows.push(["Marca", reporteData.branding.name || "Costly3D"]);
    resumenRows.push(["Color primario", reporteData.branding.primaryColor || ""]);
    resumenRows.push(["Footer", reporteData.branding.footerText || ""]);
    if (reporteData.branding.instagram) {
      resumenRows.push(["Instagram", reporteData.branding.instagram]);
    }
    if (reporteData.branding.whatsapp) {
      resumenRows.push(["WhatsApp", reporteData.branding.whatsapp]);
    }
    if (reporteData.branding.website) {
      resumenRows.push(["Sitio web", reporteData.branding.website]);
    }
    if (reporteData.branding.logoDataUrl) {
      resumenRows.push(["Logo (dataURL)", reporteData.branding.logoDataUrl]);
    }
    resumenRows.push([]);
  }
  resumenRows.push(
    ["Reporte mensual", reporteData.periodoLabel],
    [],
    ["Ingresos totales", reporteData.ingresos.total],
    ["Perdidas totales", reporteData.perdidas.total],
    ["Filamento desperdiciado (g)", reporteData.perdidas.filamentoDesperdiciadoGramos],
    ["Piezas fallidas", reporteData.perdidas.piezasFallidas],
    ["Consumo total (g)", reporteData.consumoFilamento.totalGramos],
    ["Rentabilidad neta", reporteData.rentabilidadNeta.neto],
    ["Margen neto (%)", reporteData.rentabilidadNeta.margenPct],
  );
  const resumenSheet = XLSX.utils.aoa_to_sheet(resumenRows);
  XLSX.utils.book_append_sheet(workbook, resumenSheet, "Resumen");

  const detalleHeaders = [
    "Fecha",
    "Nombre",
    "Categoria",
    "Estado",
    "Tiempo (min)",
    "Material (g)",
    "Costo Total",
    "Precio Venta",
    "Ganancia",
    "Material",
    "Color",
    "Marca",
    "Gramos usados",
    "Gramos perdidos",
    "Costo material perdido",
    "Costo energia perdida",
    "Nota fallo",
  ];
  const detalleRows = reporteData.detalle.map((row) => [
    row.fecha,
    row.producto,
    row.categoria,
    row.estado,
    row.tiempoMin,
    row.materialGrams,
    row.costoTotal,
    row.precioVenta,
    row.ganancia,
    row.material,
    row.color,
    row.marca,
    row.gramosUsados,
    row.gramosPerdidos,
    row.costoMaterialPerdido,
    row.costoEnergiaPerdida,
    row.notaFallo,
  ]);
  const detalleSheet = XLSX.utils.aoa_to_sheet([detalleHeaders, ...detalleRows]);
  XLSX.utils.book_append_sheet(workbook, detalleSheet, "Detalle");

  const topRows = [
    ["Producto", "Ingresos", "Unidades", "Margen %"],
    ...reporteData.topProductos.items.map((item) => [
      item.name,
      item.ingresos,
      item.unidades,
      item.margenPct,
    ]),
  ];
  const topSheet = XLSX.utils.aoa_to_sheet(topRows);
  XLSX.utils.book_append_sheet(workbook, topSheet, "Top productos");

  const consumoRows = [
    ["Material", "Color", "Marca", "Gramos usados"],
    ...reporteData.consumoDetalle.map((row) => [row.material, row.color, row.marca, row.gramos]),
  ];
  const consumoSheet = XLSX.utils.aoa_to_sheet(consumoRows);
  XLSX.utils.book_append_sheet(workbook, consumoSheet, "Consumo material");

  const insightsRows = [["Insights"], ...reporteData.insights.map((item) => [item])];
  const insightsSheet = XLSX.utils.aoa_to_sheet(insightsRows);
  XLSX.utils.book_append_sheet(workbook, insightsSheet, "Insights");

  XLSX.writeFile(workbook, `reporte-mensual-${reporteData.periodoKey}.xlsx`);
};

export const exportarPDF = async (
  reporteData: ReporteExportData,
  element: HTMLElement | null,
) => {
  if (!reporteData || reporteData.detalle.length === 0) {
    throw new Error("NO_DATA");
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(value);
  const formatNumber = (value: number) =>
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  const formatPercent = (value: number) =>
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);

  const normalizeEstado = (value: string) => {
    const normalized = value.toLowerCase();
    if (normalized.includes("fall")) return "Fallida";
    if (normalized.includes("ok")) return "OK";
    if (normalized.includes("final")) return "OK";
    return value || "—";
  };

  const ensureSpace = (height: number) => {
    if (cursorY + height <= pageHeight - margin) return;
    pdf.addPage();
    cursorY = margin;
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(28);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(title, margin, cursorY);
    cursorY += 16;
    pdf.setDrawColor(220);
    pdf.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 12;
  };

  const drawKeyValue = (label: string, value: string, x: number, y: number) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(80);
    pdf.text(label, x, y);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(0);
    pdf.text(value, x, y + 14);
  };
  const lineHeight = 12;
  const listItemGap = 2;
  const wrapText = (text: string, maxWidth: number) =>
    pdf.splitTextToSize(text, maxWidth) as string[];
  const estimateWrappedHeight = (texts: string[], maxWidth: number) =>
    texts.reduce((sum, text) => sum + wrapText(text, maxWidth).length * lineHeight + listItemGap, 0);
  const drawWrappedList = (texts: string[], startX: number, maxWidth: number, startY: number) => {
    let y = startY;
    texts.forEach((text) => {
      const lines = wrapText(text, maxWidth);
      lines.forEach((line) => {
        pdf.text(line, startX, y);
        y += lineHeight;
      });
      y += listItemGap;
    });
    return y;
  };

  const branding = reporteData.branding;
  const title = "Costly3D – Reporte mensual de producción y rentabilidad";
  const businessName = branding?.name || "Costly3D";
  const periodo = reporteData.periodoLabel;
  const generatedDate = new Date().toLocaleDateString("es-AR");
  const getImageFormat = (dataUrl: string) => {
    if (dataUrl.startsWith("data:image/jpeg")) return "JPEG";
    if (dataUrl.startsWith("data:image/jpg")) return "JPG";
    return "PNG";
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(title, margin, cursorY);
  cursorY += 24;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(`Negocio: ${businessName}`, margin, cursorY);
  cursorY += 16;
  pdf.text(`Período: ${periodo}`, margin, cursorY);
  cursorY += 16;
  pdf.text(`Fecha de generación: ${generatedDate}`, margin, cursorY);

  if (branding?.logoDataUrl) {
    try {
      const logoWidth = 70;
      const logoHeight = 40;
      pdf.addImage(
        branding.logoDataUrl,
        getImageFormat(branding.logoDataUrl),
        pageWidth - margin - logoWidth,
        margin,
        logoWidth,
        logoHeight,
      );
    } catch (error) {
      // Ignore logo errors to avoid breaking the export.
    }
  }

  cursorY += 24;

  const totalRegistros = reporteData.detalle.length;
  const fallidas = reporteData.detalle.filter((row) => normalizeEstado(row.estado) === "Fallida").length;
  const confirmadas = totalRegistros - fallidas;
  const costosTotales = reporteData.detalle
    .filter((row) => normalizeEstado(row.estado) !== "Fallida")
    .reduce((sum, row) => sum + (row.costoTotal || 0), 0);

  drawSectionTitle("Resumen ejecutivo");
  ensureSpace(80);
  const summaryRowY = cursorY;
  const colGap = 18;
  const colWidth = (contentWidth - colGap * 2) / 3;

  drawKeyValue("Impresiones confirmadas", formatNumber(confirmadas), margin, summaryRowY);
  drawKeyValue(
    "Impresiones fallidas",
    formatNumber(fallidas),
    margin + colWidth + colGap,
    summaryRowY,
  );
  drawKeyValue("Ingresos totales", formatMoney(reporteData.ingresos.total), margin + (colWidth + colGap) * 2, summaryRowY);

  const secondRowY = summaryRowY + 40;
  drawKeyValue("Costos totales", formatMoney(costosTotales), margin, secondRowY);
  drawKeyValue(
    "Ganancia neta",
    formatMoney(reporteData.rentabilidadNeta.neto),
    margin + colWidth + colGap,
    secondRowY,
  );
  drawKeyValue(
    "Margen promedio",
    `${formatPercent(reporteData.rentabilidadNeta.margenPct)}%`,
    margin + (colWidth + colGap) * 2,
    secondRowY,
  );

  const thirdRowY = secondRowY + 40;
  drawKeyValue(
    "Material perdido (g)",
    formatNumber(reporteData.perdidas.filamentoDesperdiciadoGramos),
    margin,
    thirdRowY,
  );
  cursorY = thirdRowY + 36;

  drawSectionTitle("Producción del mes");

  const tableColumns = [
    { label: "Producto", width: 120 },
    { label: "Categoría", width: 80 },
    { label: "Estado", width: 50 },
    { label: "Material (g)", width: 55 },
    { label: "Costo total", width: 60 },
    { label: "Precio venta", width: 60 },
    { label: "Ganancia", width: 60 },
  ];
  const tableX = margin;
  const headerHeight = 18;

  const drawTableHeader = () => {
    ensureSpace(headerHeight + 8);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setFillColor(245, 245, 245);
    pdf.rect(tableX, cursorY, contentWidth, headerHeight, "F");
    let x = tableX;
    tableColumns.forEach((col) => {
      pdf.text(col.label, x + 4, cursorY + 12);
      x += col.width;
    });
    cursorY += headerHeight + 6;
  };

  drawTableHeader();
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  reporteData.detalle.forEach((row) => {
    const estado = normalizeEstado(row.estado);
    const material = row.materialGrams || row.gramosUsados || 0;
    const cells = [
      row.producto || "Producto",
      row.categoria || "General",
      estado,
      formatNumber(material),
      formatMoney(row.costoTotal || 0),
      formatMoney(row.precioVenta || 0),
      formatMoney(row.ganancia || 0),
    ];

    const productLines = pdf.splitTextToSize(cells[0], tableColumns[0].width - 8);
    const categoryLines = pdf.splitTextToSize(cells[1], tableColumns[1].width - 8);
    const rowLines = Math.max(productLines.length, categoryLines.length, 1);
    const rowHeight = rowLines * 12;

    ensureSpace(rowHeight + 4);
    let x = tableX;

    productLines.forEach((line, index) => {
      pdf.text(line, x + 4, cursorY + 10 + index * 12);
    });
    x += tableColumns[0].width;

    categoryLines.forEach((line, index) => {
      pdf.text(line, x + 4, cursorY + 10 + index * 12);
    });
    x += tableColumns[1].width;

    pdf.text(cells[2], x + 4, cursorY + 10);
    x += tableColumns[2].width;
    pdf.text(cells[3], x + 4, cursorY + 10);
    x += tableColumns[3].width;
    pdf.text(cells[4], x + 4, cursorY + 10);
    x += tableColumns[4].width;
    pdf.text(cells[5], x + 4, cursorY + 10);
    x += tableColumns[5].width;
    pdf.text(cells[6], x + 4, cursorY + 10);

    cursorY += rowHeight + 4;
    if (cursorY > pageHeight - margin - 20) {
      pdf.addPage();
      cursorY = margin;
      drawTableHeader();
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
    }
  });

  const productStats = new Map<
    string,
    { ingresos: number; ganancia: number; margen: number }
  >();
  reporteData.detalle.forEach((row) => {
    const key = row.producto || "Producto";
    const current = productStats.get(key) ?? { ingresos: 0, ganancia: 0, margen: 0 };
    const ingresos = row.precioVenta || 0;
    const ganancia = row.ganancia || 0;
    current.ingresos += ingresos;
    current.ganancia += ganancia;
    current.margen = current.ingresos > 0 ? (current.ganancia / current.ingresos) * 100 : 0;
    productStats.set(key, current);
  });

  const topByGanancia = Array.from(productStats.entries())
    .map(([name, item]) => ({ name, ganancia: item.ganancia, margen: item.margen }))
    .sort((a, b) => b.ganancia - a.ganancia)
    .slice(0, 5);

  const topByMargen = Array.from(productStats.entries())
    .map(([name, item]) => ({ name, ganancia: item.ganancia, margen: item.margen }))
    .sort((a, b) => b.margen - a.margen)
    .slice(0, 5);

  const rankingTextsByGanancia = topByGanancia.map(
    (item, index) => `${index + 1}. ${item.name} — ${formatMoney(item.ganancia)} (${formatPercent(item.margen)}%)`,
  );
  const rankingTextsByMargen = topByMargen.map(
    (item, index) => `${index + 1}. ${item.name} — ${formatPercent(item.margen)}%`,
  );
  const rankingColumnGap = 10;
  const rankingColumnWidth = (contentWidth - rankingColumnGap) / 2;
  const rankingListHeight = Math.max(
    estimateWrappedHeight(rankingTextsByGanancia, rankingColumnWidth),
    estimateWrappedHeight(rankingTextsByMargen, rankingColumnWidth),
  );
  cursorY += 8;
  ensureSpace(rankingListHeight + 36);
  drawSectionTitle("Ranking de productos");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("Top por ganancia", margin, cursorY);
  pdf.text("Top por margen", margin + rankingColumnWidth + rankingColumnGap, cursorY);
  cursorY += 14;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const listStartY = cursorY;
  const gananciaEndY = drawWrappedList(rankingTextsByGanancia, margin, rankingColumnWidth, listStartY);
  const margenEndY = drawWrappedList(
    rankingTextsByMargen,
    margin + rankingColumnWidth + rankingColumnGap,
    rankingColumnWidth,
    listStartY,
  );
  cursorY = Math.max(gananciaEndY, margenEndY) + 8;

  drawSectionTitle("Análisis de fallos");
  const pctFallos = totalRegistros > 0 ? (fallidas / totalRegistros) * 100 : 0;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Impresiones fallidas: ${formatNumber(fallidas)}`, margin, cursorY);
  cursorY += 16;
  pdf.text(
    `Material perdido total: ${formatNumber(reporteData.perdidas.filamentoDesperdiciadoGramos)} g`,
    margin,
    cursorY,
  );
  cursorY += 16;
  pdf.text(`Costo asociado: ${formatMoney(reporteData.perdidas.costos)}`, margin, cursorY);
  cursorY += 16;
  pdf.text(`Porcentaje sobre la producción: ${formatPercent(pctFallos)}%`, margin, cursorY);
  cursorY += 24;

  drawSectionTitle("Nota final");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const note =
    "Este reporte se genera automáticamente a partir del historial registrado en Costly3D. " +
    "Los datos reflejan únicamente las impresiones registradas durante el período seleccionado.";
  const noteLines = pdf.splitTextToSize(note, contentWidth);
  noteLines.forEach((line) => {
    ensureSpace(14);
    pdf.text(line, margin, cursorY);
    cursorY += 14;
  });

  pdf.save(`reporte-mensual-${reporteData.periodoKey}.pdf`);
};

