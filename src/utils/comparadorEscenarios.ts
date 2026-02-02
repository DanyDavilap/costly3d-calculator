export type EscenarioComparadorInput = {
  nombre: string;
  tipoFilamento: string;
  cantidad: number;
  precioUnidad: number;
  costoFilamento: number;
  costoEnergia: number;
  costoFallos: number;
  tiempoTotal: number;
  porcentajeCompletado: number;
  otrosCostos?: number;
  incluirCostosFijos: boolean;
};

export type EscenarioComparadorResult = EscenarioComparadorInput & {
  tiempoConsumido: number;
  filamentoConsumido: number;
  energiaConsumida: number;
  costoTotal: number;
  ingresoTotal: number;
  gananciaNeta: number;
  margen: number;
  costosFijosAsignados: number;
  esMejor: boolean;
};

export type ComparadorEscenariosResult = {
  escenariosCalculados: EscenarioComparadorResult[];
  rankingGanancia: EscenarioComparadorResult[];
  rankingMargen: EscenarioComparadorResult[];
  mejorEscenario: EscenarioComparadorResult | null;
};

const safeNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const safeText = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim().length > 0 ? value : fallback;

const clampPercent = (value: number) => Math.min(1, Math.max(0, value));

const safeDivision = (numerator: number, denominator: number) =>
  denominator > 0 ? numerator / denominator : 0;

export function compararEscenarios(
  escenarios: EscenarioComparadorInput[],
  costosFijos: number,
): ComparadorEscenariosResult {
  const costoFijoTotal = safeNumber(costosFijos);

  const escenariosNormalizados = escenarios.map((escenario, index) => {
    const cantidad = Math.max(0, safeNumber(escenario.cantidad));
    const precioUnidad = Math.max(0, safeNumber(escenario.precioUnidad));
    const costoFilamento = Math.max(0, safeNumber(escenario.costoFilamento));
    const costoEnergia = Math.max(0, safeNumber(escenario.costoEnergia));
    const costoFallos = Math.max(0, safeNumber(escenario.costoFallos));
    const tiempoTotal = Math.max(0, safeNumber(escenario.tiempoTotal));
    const porcentajeCompletado = clampPercent(safeNumber(escenario.porcentajeCompletado));
    const otrosCostos = Math.max(0, safeNumber(escenario.otrosCostos ?? 0));
    const incluirCostosFijos = Boolean(escenario.incluirCostosFijos);
    const ingresoTotal = precioUnidad * cantidad;

    return {
      nombre: safeText(escenario.nombre, `Escenario ${index + 1}`),
      tipoFilamento: safeText(escenario.tipoFilamento, "Material"),
      cantidad,
      precioUnidad,
      costoFilamento,
      costoEnergia,
      costoFallos,
      tiempoTotal,
      porcentajeCompletado,
      otrosCostos,
      incluirCostosFijos,
      ingresoTotal,
    };
  });

  const escenariosConFijos = escenariosNormalizados.filter((item) => item.incluirCostosFijos);
  const totalIngresosConFijos = escenariosConFijos.reduce((sum, item) => sum + item.ingresoTotal, 0);
  const totalCantidadConFijos = escenariosConFijos.reduce((sum, item) => sum + item.cantidad, 0);

  const escenariosCalculados: EscenarioComparadorResult[] = escenariosNormalizados.map((escenario) => {
    const tiempoConsumido = escenario.tiempoTotal * escenario.porcentajeCompletado;
    const filamentoConsumido = escenario.costoFilamento * escenario.porcentajeCompletado;
    const energiaConsumida = escenario.costoEnergia * escenario.porcentajeCompletado;

    let costosFijosAsignados = 0;
    if (escenario.incluirCostosFijos && costoFijoTotal > 0) {
      if (totalIngresosConFijos > 0) {
        costosFijosAsignados =
          costoFijoTotal * safeDivision(escenario.ingresoTotal, totalIngresosConFijos);
      } else if (totalCantidadConFijos > 0) {
        costosFijosAsignados =
          costoFijoTotal * safeDivision(escenario.cantidad, totalCantidadConFijos);
      }
    }

    const costoTotal =
      filamentoConsumido +
      energiaConsumida +
      escenario.costoFallos +
      escenario.otrosCostos +
      costosFijosAsignados;
    const gananciaNeta = escenario.ingresoTotal - costoTotal;
    const margen = escenario.ingresoTotal > 0 ? (gananciaNeta / escenario.ingresoTotal) * 100 : 0;

    return {
      nombre: escenario.nombre,
      tipoFilamento: escenario.tipoFilamento,
      cantidad: escenario.cantidad,
      precioUnidad: escenario.precioUnidad,
      costoFilamento: escenario.costoFilamento,
      costoEnergia: escenario.costoEnergia,
      costoFallos: escenario.costoFallos,
      tiempoTotal: escenario.tiempoTotal,
      porcentajeCompletado: escenario.porcentajeCompletado,
      otrosCostos: escenario.otrosCostos,
      incluirCostosFijos: escenario.incluirCostosFijos,
      tiempoConsumido,
      filamentoConsumido,
      energiaConsumida,
      costoTotal,
      ingresoTotal: escenario.ingresoTotal,
      gananciaNeta,
      margen,
      costosFijosAsignados,
      esMejor: false,
    };
  });

  const rankingGanancia = [...escenariosCalculados].sort((a, b) => b.gananciaNeta - a.gananciaNeta);
  const rankingMargen = [...escenariosCalculados].sort((a, b) => b.margen - a.margen);
  const mejorEscenario = rankingGanancia[0] ?? null;

  if (mejorEscenario) {
    const bestIndex = escenariosCalculados.indexOf(mejorEscenario);
    if (bestIndex >= 0) {
      escenariosCalculados[bestIndex].esMejor = true;
    }
  }

  return {
    escenariosCalculados,
    rankingGanancia,
    rankingMargen,
    mejorEscenario,
  };
}
