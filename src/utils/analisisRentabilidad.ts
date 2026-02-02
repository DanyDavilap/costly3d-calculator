export type ProductoRentabilidadInput = {
  nombre: string;
  precioVenta: number;
  cantidadVendida: number;
  costoFilamento: number;
  costoEnergia: number;
  costoFallos: number;
  otrosCostos?: number;
  incluirCostosFijos: boolean;
};

export type ProductoRentabilidadResult = {
  nombre: string;
  ingresoTotal: number;
  costoTotal: number;
  gananciaNeta: number;
  margenReal: number;
  costosFijosAsignados: number;
  cantidadVendida: number;
};

export type AnalisisRentabilidadResult = {
  productosConGanancia: ProductoRentabilidadResult[];
  rankingGanancia: ProductoRentabilidadResult[];
  rankingMargen: ProductoRentabilidadResult[];
};

const safeNumber = (value: number) => (Number.isFinite(value) ? value : 0);

const safeDivision = (numerator: number, denominator: number) =>
  denominator > 0 ? numerator / denominator : 0;

export function analisisRentabilidad(
  productos: ProductoRentabilidadInput[],
  costosFijos: number,
): AnalisisRentabilidadResult {
  const productosNormalizados = productos.map((producto) => ({
    ...producto,
    precioVenta: safeNumber(producto.precioVenta),
    cantidadVendida: safeNumber(producto.cantidadVendida),
    costoFilamento: safeNumber(producto.costoFilamento),
    costoEnergia: safeNumber(producto.costoEnergia),
    costoFallos: safeNumber(producto.costoFallos),
    otrosCostos: safeNumber(producto.otrosCostos ?? 0),
  }));

  const productosConFijos = productosNormalizados.filter((item) => item.incluirCostosFijos);
  const totalIngresosConFijos = productosConFijos.reduce(
    (sum, item) => sum + item.precioVenta * item.cantidadVendida,
    0,
  );
  const totalCantidadConFijos = productosConFijos.reduce((sum, item) => sum + item.cantidadVendida, 0);
  const costoFijoTotal = safeNumber(costosFijos);

  const productosConGanancia = productosNormalizados.map((producto) => {
    const ingresoTotal = producto.precioVenta * producto.cantidadVendida;
    let costosFijosAsignados = 0;

    if (producto.incluirCostosFijos && costoFijoTotal > 0) {
      if (totalIngresosConFijos > 0) {
        costosFijosAsignados = costoFijoTotal * safeDivision(ingresoTotal, totalIngresosConFijos);
      } else if (totalCantidadConFijos > 0) {
        costosFijosAsignados = costoFijoTotal * safeDivision(producto.cantidadVendida, totalCantidadConFijos);
      }
    }

    const costoTotal =
      producto.costoFilamento +
      producto.costoEnergia +
      producto.costoFallos +
      producto.otrosCostos +
      costosFijosAsignados;
    const gananciaNeta = ingresoTotal - costoTotal;
    const margenReal = safeDivision(gananciaNeta, ingresoTotal) * 100;

    return {
      nombre: producto.nombre,
      ingresoTotal,
      costoTotal,
      gananciaNeta,
      margenReal,
      costosFijosAsignados,
      cantidadVendida: producto.cantidadVendida,
    };
  });

  const rankingGanancia = [...productosConGanancia].sort((a, b) => b.gananciaNeta - a.gananciaNeta);
  const rankingMargen = [...productosConGanancia].sort((a, b) => b.margenReal - a.margenReal);

  return {
    productosConGanancia,
    rankingGanancia,
    rankingMargen,
  };
}
