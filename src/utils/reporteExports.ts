import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
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
};

export const exportarExcel = (reporteData: ReporteExportData) => {
  if (!reporteData || reporteData.detalle.length === 0) {
    throw new Error("NO_DATA");
  }

  const workbook = XLSX.utils.book_new();

  const resumenRows = [
    ["Reporte mensual", reporteData.periodoLabel],
    [],
    ["Ingresos totales", reporteData.ingresos.total],
    ["Perdidas totales", reporteData.perdidas.total],
    ["Filamento desperdiciado (g)", reporteData.perdidas.filamentoDesperdiciadoGramos],
    ["Piezas fallidas", reporteData.perdidas.piezasFallidas],
    ["Consumo total (g)", reporteData.consumoFilamento.totalGramos],
    ["Rentabilidad neta", reporteData.rentabilidadNeta.neto],
    ["Margen neto (%)", reporteData.rentabilidadNeta.margenPct],
  ];
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
  if (!element) {
    throw new Error("NO_ELEMENT");
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let position = 0;
  let heightLeft = imgHeight;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(`reporte-mensual-${reporteData.periodoKey}.pdf`);
};
