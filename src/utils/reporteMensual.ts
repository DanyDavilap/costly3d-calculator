export type VentaMensual = {
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  costTotal?: number;
};

export type FalloMensual = {
  productName: string;
  gramsLost: number;
  piecesFailed: number;
  materialCostLost: number;
  energyCostLost: number;
};

export type ConsumoMensual = {
  materialType: string;
  gramsUsed: number;
};

export type ReporteMensual = {
  ingresos: {
    total: number;
    productos: {
      name: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[];
    chart: { labels: string[]; values: number[] };
  };
  perdidas: {
    total: number;
    filamentoDesperdiciadoGramos: number;
    piezasFallidas: number;
    costos: number;
    chart: { lossPct: number };
  };
  consumoFilamento: {
    totalGramos: number;
    porTipo: { material: string; grams: number }[];
    chart: { labels: string[]; values: number[] };
  };
  topProductos: {
    items: { name: string; ingresos: number; unidades: number; margenPct: number }[];
    chart: { labels: string[]; values: number[] };
  };
  rentabilidadNeta: {
    neto: number;
    margenPct: number;
  };
  insights: string[];
};

const roundNumber = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function generarReporteMensual(
  ventas: VentaMensual[],
  fallos: FalloMensual[],
  consumo: ConsumoMensual[],
): ReporteMensual {
  const ingresosTotal = ventas.reduce((sum, item) => sum + item.total, 0);

  const productosMap = new Map<
    string,
    { quantity: number; subtotal: number; unitPriceSum: number; unitCount: number; costTotal: number }
  >();
  ventas.forEach((venta) => {
    const key = venta.productName || "Producto";
    const current = productosMap.get(key) ?? {
      quantity: 0,
      subtotal: 0,
      unitPriceSum: 0,
      unitCount: 0,
      costTotal: 0,
    };
    current.quantity += venta.quantity;
    current.subtotal += venta.total;
    current.unitPriceSum += venta.unitPrice;
    current.unitCount += 1;
    current.costTotal += venta.costTotal ?? 0;
    productosMap.set(key, current);
  });

  const productos = Array.from(productosMap.entries()).map(([name, item]) => ({
    name,
    quantity: item.quantity,
    unitPrice: item.unitCount > 0 ? item.unitPriceSum / item.unitCount : 0,
    subtotal: item.subtotal,
    costTotal: item.costTotal,
  }));

  const productosOutput = productos.map(({ costTotal, ...rest }) => rest);

  const topProductosOrdenados = [...productos]
    .sort((a, b) => b.subtotal - a.subtotal)
    .slice(0, 5);

  const fallasGramos = fallos.reduce((sum, item) => sum + item.gramsLost, 0);
  const piezasFallidas = fallos.reduce((sum, item) => sum + item.piecesFailed, 0);
  const costosFallos = fallos.reduce(
    (sum, item) => sum + item.materialCostLost + item.energyCostLost,
    0,
  );

  const consumoMap = new Map<string, number>();
  consumo.forEach((item) => {
    const key = item.materialType || "Otro";
    consumoMap.set(key, (consumoMap.get(key) ?? 0) + item.gramsUsed);
  });

  const consumoList = Array.from(consumoMap.entries()).map(([material, grams]) => ({
    material,
    grams,
  }));
  const consumoTotal = consumoList.reduce((sum, item) => sum + item.grams, 0);

  const topProductos = topProductosOrdenados.map((item) => {
    const margenPct = item.subtotal > 0 ? ((item.subtotal - item.costTotal) / item.subtotal) * 100 : 0;
    return {
      name: item.name,
      ingresos: item.subtotal,
      unidades: item.quantity,
      margenPct: roundNumber(margenPct),
    };
  });

  const costosTotalesVentas = productos.reduce((sum, item) => sum + item.costTotal, 0);
  const neto = ingresosTotal - costosTotalesVentas;
  const margenPct = ingresosTotal > 0 ? (neto / ingresosTotal) * 100 : 0;

  const insights: string[] = [];
  if (costosFallos > 0) {
    insights.push("Reducir fallos en impresiones criticas para mejorar margenes.");
  }
  if (topProductos[0]) {
    insights.push(`Potenciar el producto ${topProductos[0].name} para maximizar ingresos.`);
  }
  if (consumoTotal > 0 && consumoList.length > 1) {
    insights.push("Revisar consumos por material para optimizar compras y stock.");
  }
  if (insights.length === 0) {
    insights.push("Mantener consistencia en precios y registrar mas ventas para metricas mas precisas.");
  }

  const ingresosChart = topProductosOrdenados.slice(0, 4);
  const consumoChart = consumoList.slice(0, 4);

  return {
    ingresos: {
      total: roundNumber(ingresosTotal),
      productos: productosOutput.sort((a, b) => b.subtotal - a.subtotal),
      chart: {
        labels: ingresosChart.map((item) => item.name),
        values: ingresosChart.map((item) => roundNumber(item.subtotal)),
      },
    },
    perdidas: {
      total: roundNumber(costosFallos),
      filamentoDesperdiciadoGramos: roundNumber(fallasGramos),
      piezasFallidas,
      costos: roundNumber(costosFallos),
      chart: {
        lossPct: ingresosTotal > 0 ? roundNumber((costosFallos / ingresosTotal) * 100) : 0,
      },
    },
    consumoFilamento: {
      totalGramos: roundNumber(consumoTotal),
      porTipo: consumoList.sort((a, b) => b.grams - a.grams),
      chart: {
        labels: consumoChart.map((item) => item.material),
        values: consumoChart.map((item) => roundNumber(item.grams)),
      },
    },
    topProductos: {
      items: topProductos,
      chart: {
        labels: topProductos.map((item) => item.name),
        values: topProductos.map((item) => roundNumber(item.ingresos)),
      },
    },
    rentabilidadNeta: {
      neto: roundNumber(neto),
      margenPct: roundNumber(margenPct),
    },
    insights,
  };
}

