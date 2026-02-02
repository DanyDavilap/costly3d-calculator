export type EstadoImpresion = "terminada" | "fallida";

export type ImpresionConsumoInput = {
  estado: EstadoImpresion;
  tiempoTotal: number;
  filamentoTotal: number;
  energiaTotal: number;
  porcentajeCompletado?: number;
};

export type ConsumoImpresionesResult = {
  tiempoTotalConsumido: number;
  filamentoTotalConsumido: number;
  energiaTotalConsumida: number;
  totalImpresionesTerminadas: number;
  totalImpresionesFallidas: number;
  porcentajeFallas: number;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function calcularConsumoImpresiones(
  impresiones: ImpresionConsumoInput[],
): ConsumoImpresionesResult {
  let tiempoTotalConsumido = 0;
  let filamentoTotalConsumido = 0;
  let energiaTotalConsumida = 0;
  let totalImpresionesTerminadas = 0;
  let totalImpresionesFallidas = 0;

  impresiones.forEach((impresion) => {
    const tiempo = isFiniteNumber(impresion.tiempoTotal) ? impresion.tiempoTotal : 0;
    const filamento = isFiniteNumber(impresion.filamentoTotal) ? impresion.filamentoTotal : 0;
    const energia = isFiniteNumber(impresion.energiaTotal) ? impresion.energiaTotal : 0;

    if (impresion.estado === "terminada") {
      totalImpresionesTerminadas += 1;
      tiempoTotalConsumido += tiempo;
      filamentoTotalConsumido += filamento;
      energiaTotalConsumida += energia;
      return;
    }

    if (impresion.estado === "fallida") {
      totalImpresionesFallidas += 1;
      const pct = clamp01(
        isFiniteNumber(impresion.porcentajeCompletado) ? impresion.porcentajeCompletado : 0,
      );
      tiempoTotalConsumido += tiempo * pct;
      filamentoTotalConsumido += filamento * pct;
      energiaTotalConsumida += energia * pct;
    }
  });

  const totalImpresiones = totalImpresionesTerminadas + totalImpresionesFallidas;
  const porcentajeFallas = totalImpresiones > 0 ? totalImpresionesFallidas / totalImpresiones : 0;

  return {
    tiempoTotalConsumido,
    filamentoTotalConsumido,
    energiaTotalConsumida,
    totalImpresionesTerminadas,
    totalImpresionesFallidas,
    porcentajeFallas,
  };
}
