export type EscenarioComparadorV1Input = {
  id: string;
  nombre: string;
  cantidadImpresiones: number;
  precioUnitario: number;
  costoMaterialPorGramo: number;
  gramosPorImpresion: number;
  costoEnergiaPorImpresion: number;
  porcentajeFallos: number;
  porcentajeImpresoFallida: number;
};

export type EscenarioComparadorV1Result = EscenarioComparadorV1Input & {
  impresionesOk: number;
  impresionesFallidas: number;
  materialTotalUsado: number;
  materialPerdido: number;
  costoMaterial: number;
  costoEnergia: number;
  costoTotal: number;
  ingresosTotales: number;
  gananciaNeta: number;
  margen: number;
};

export type ComparadorV1Summary = {
  escenarios: EscenarioComparadorV1Result[];
  mejorGananciaId: string | null;
  mejorMargenId: string | null;
};

const safeNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const clampPct = (value: number) => Math.min(100, Math.max(0, value));

export const compararEscenariosV1 = (
  escenarios: EscenarioComparadorV1Input[],
): ComparadorV1Summary => {
  const escenariosCalc: EscenarioComparadorV1Result[] = escenarios.map((escenario) => {
    const cantidad = Math.max(0, safeNumber(escenario.cantidadImpresiones));
    const precioUnitario = Math.max(0, safeNumber(escenario.precioUnitario));
    const costoMaterialPorGramo = Math.max(0, safeNumber(escenario.costoMaterialPorGramo));
    const gramosPorImpresion = Math.max(0, safeNumber(escenario.gramosPorImpresion));
    const costoEnergiaPorImpresion = Math.max(0, safeNumber(escenario.costoEnergiaPorImpresion));
    const porcentajeFallos = clampPct(safeNumber(escenario.porcentajeFallos));
    const porcentajeImpresoFallida = clampPct(safeNumber(escenario.porcentajeImpresoFallida));

    const impresionesFallidas = cantidad * (porcentajeFallos / 100);
    const impresionesOk = Math.max(0, cantidad - impresionesFallidas);
    const factorFallida = porcentajeImpresoFallida / 100;

    const materialPerdido = impresionesFallidas * gramosPorImpresion * factorFallida;
    const materialTotalUsado = impresionesOk * gramosPorImpresion + materialPerdido;
    const costoMaterial = materialTotalUsado * costoMaterialPorGramo;
    const costoEnergia = impresionesOk * costoEnergiaPorImpresion + impresionesFallidas * costoEnergiaPorImpresion * factorFallida;
    const costoTotal = costoMaterial + costoEnergia;
    const ingresosTotales = impresionesOk * precioUnitario;
    const gananciaNeta = ingresosTotales - costoTotal;
    const margen = ingresosTotales > 0 ? (gananciaNeta / ingresosTotales) * 100 : 0;

    return {
      ...escenario,
      cantidadImpresiones: cantidad,
      precioUnitario,
      costoMaterialPorGramo,
      gramosPorImpresion,
      costoEnergiaPorImpresion,
      porcentajeFallos,
      porcentajeImpresoFallida,
      impresionesOk,
      impresionesFallidas,
      materialTotalUsado,
      materialPerdido,
      costoMaterial,
      costoEnergia,
      costoTotal,
      ingresosTotales,
      gananciaNeta,
      margen,
    };
  });

  const mejorGanancia = escenariosCalc.reduce<EscenarioComparadorV1Result | null>(
    (best, current) => (!best || current.gananciaNeta > best.gananciaNeta ? current : best),
    null,
  );
  const mejorMargen = escenariosCalc.reduce<EscenarioComparadorV1Result | null>(
    (best, current) => (!best || current.margen > best.margen ? current : best),
    null,
  );

  return {
    escenarios: escenariosCalc,
    mejorGananciaId: mejorGanancia?.id ?? null,
    mejorMargenId: mejorMargen?.id ?? null,
  };
};
