# Costly3D — Fase 2 de la migración a Colombia

Fecha de cierre: 19 de septiembre de 2026.

## Alcance y resultado

Esta fase introduce las fundaciones regionales, financieras y de persistencia para operar en Colombia sin convertir importes históricos ni inventar tarifas productivas. La operación nueva usa `CO`, `COP`, `es-CO` y `America/Bogota`; los datos anteriores siguen siendo legibles como `legacy-ARS`.

No se implementaron impuestos colombianos, depreciación automática, facturación ni un módulo completo de ventas. Tampoco se ejecutó ninguna transformación masiva de `localStorage`.

## 1. Archivos modificados

Archivos de aplicación actualizados:

- `package.json` y `package-lock.json`: infraestructura de Vitest y script `npm test`.
- `src/pages/Dashboard/Dashboard.tsx`: integración incremental del motor V2, formulario de pricing, snapshots, lectura legacy, formatos por moneda, respaldo y separación visual de métricas.
- `src/utils/monthlyMetrics.ts`: separación entre ingresos estimados y reales.
- `src/utils/pdfTheme.ts`: formato predeterminado delegado a la configuración regional COP.
- `src/utils/pricingCalculator.ts`: puente de compatibilidad para el desglose V2.
- `src/utils/reporteExports.ts`: formato regional central, rótulos estimados y moneda explícita por detalle.

Archivos nuevos:

- `src/config/regional.ts`
- `src/core/financialEngineV2.ts`
- `src/core/salesMetrics.ts`
- `src/domain/sales.ts`
- `src/domain/production.ts`
- `src/persistence/financialVersioning.ts`
- `src/persistence/financialBackup.ts`
- `src/utils/v2PricingAdapter.ts`
- `src/core/calculatePrintCost.test.ts`
- `src/core/financialEngineV2.test.ts`
- `src/core/salesMetrics.test.ts`
- `src/config/regional.test.ts`
- `src/persistence/financialVersioning.test.ts`
- `src/persistence/financialBackup.test.ts`
- `src/utils/v2PricingAdapter.test.ts`

## 2. Arquitectura nueva

La implementación separa responsabilidades sin reescribir el Dashboard:

1. `regional.ts` define región y presentación.
2. `financialEngineV2.ts` calcula costos y pricing con números sin formato.
3. `v2PricingAdapter.ts` adapta el formulario actual al dominio V2.
4. `financialVersioning.ts` clasifica datos nuevos y legacy al leerlos.
5. `financialBackup.ts` exporta una copia reutilizable de las claves financieras.
6. Los tipos de `Sale` y seguimiento de producción preparan métricas reales futuras sin construir todavía esos módulos.

El motor no importa React, DOM, `localStorage` ni funciones de presentación. El adaptador mantiene temporalmente el único campo de tiempo de armado de la UI como una tarea laboral; el núcleo ya acepta múltiples tareas y múltiples adicionales.

## 3. Configuración regional

La fuente única de verdad productiva es `COLOMBIA_REGIONAL_CONFIG`:

```ts
{
  country: "CO",
  currency: "COP",
  locale: "es-CO",
  timeZone: "America/Bogota",
  moneyFractionDigits: 0
}
```

También existe `LEGACY_ARGENTINA_REGIONAL_CONFIG` exclusivamente para presentar históricos ARS. `formatMoney`, `formatNumber`, `formatPercent` y `formatDate` están centralizados. El formato monetario COP no muestra centavos y los cálculos internos no dependen de strings como `$ 80.000`.

## 4. Versionado de datos

Los registros financieros V2 incluyen explícitamente:

- `schemaVersion: 2`;
- `calculationModelVersion: "costly3d-v2"`;
- `country: "CO"`;
- `currency: "COP"`;
- `locale: "es-CO"`;
- un `financialSnapshot` con insumos y resultados del cálculo.

Los registros sin metadata reconocida se enriquecen solo en memoria como:

- `schemaVersion: 1`;
- `calculationModelVersion: "legacy-v1"`;
- `regionalTag: "legacy-ARS"`;
- `country: "AR"`;
- `currency: "ARS"`;
- `locale: "es-AR"`.

La función de compatibilidad de lectura no muta el objeto fuente ni escribe una migración automática.

## 5. Estrategia legacy ARS

- No existe conversión ARS → COP.
- Los importes legacy no se recalculan con el motor V2.
- Una cotización legacy se abre en modo de solo lectura.
- Su duplicación conserva importes y metadata ARS, sin recalcular.
- Las tablas y los PDF de cotización seleccionan el formateador por moneda; ARS incluye el código `ARS` para evitar ambigüedad.
- Los spools anteriores quedan etiquetados como legacy ARS y su costo no se usa como si fuera COP. Al editarlos, el campo COP se presenta vacío para exigir un valor nuevo y explícito.
- Los totales de reportes nuevos solo agregan registros COP. Los históricos ARS pueden aparecer en el detalle con su moneda, pero no se suman a un total COP.
- La clave anterior `calculatorBaseParams` no se sobrescribe. Los parámetros V2 se guardan en `calculatorBaseParamsV2`.

## 6. Motor de costos

`calculateCostV2` representa:

```text
material neto
+ desperdicio planificado
+ electricidad
+ uso de máquina
+ mano de obra
+ postprocesado/adicionales
= costo de producción estimado
```

Detalles principales:

- Material: snapshot de material, spool/lote, gramos netos, porcentaje y gramos de desperdicio, gramos cobrables, costo/kg, costo/g, moneda y fecha/contexto.
- Electricidad: conserva por separado potencia en kW, horas, `energyKwh`, tarifa y costo.
- Máquina: `printingHours × machineCostPerHour`, independiente de electricidad.
- Mano de obra: lista de tareas, cada una con `(minutes / 60) × hourlyRate`.
- Adicionales: lista con `id`, nombre, cantidad, costo unitario, costo total y categoría.
- Producción futura: `ProductionMaterialTracking` separa material planificado, consumo real opcional y progreso de una falla. La fórmula porcentual de fallas anterior no se incorporó al motor V2.

La UI todavía usa una sola tarea de armado y no expone line items adicionales; esa limitación está en el adaptador, no en el motor.

## 7. Pricing: markup y margen objetivo

Los modos son explícitos:

- `markup`: `price = cost × (1 + percentage / 100)`.
- `target_margin`: `price = cost / (1 - percentage / 100)`.

El resultado conserva costo de producción, precio matemático, precio comercial, utilidad matemática/comercial, markup resultante y margen resultante. La UI usa los rótulos “Recargo sobre costo (Markup)”, “Margen objetivo”, “Margen resultante” y “Utilidad estimada”; no llama margen al markup.

El núcleo rechaza un margen objetivo mayor o igual a 100 %, valores negativos, `NaN`, `Infinity`, cantidades no positivas en adicionales y estrategias no reconocidas.

## 8. Precisión y redondeo

Los componentes se calculan con números crudos y no se redondean de manera intermedia. El formateo COP sin centavos ocurre únicamente en presentación.

Las estrategias comerciales disponibles son:

- `exact`;
- `nearest100`;
- `nearest500`;
- `nearest1000`.

Para valores no negativos se usa `Math.round(price / step) × step`. Por ejemplo, `32.347` con `nearest1000` produce `32.000`. Se guardan tanto `mathematicalPrice` como `commercialPrice`; la utilidad y los porcentajes resultantes del precio sugerido se calculan contra el precio comercial.

## 9. Tests

Se instaló `vitest@2.1.9` sin actualizar Vite ni realizar upgrades mayores. Se añadió primero una prueba de caracterización del motor legacy y después pruebas unitarias del modelo V2, regionalización, adaptador, versionado, respaldo y ventas.

Resultado final de `npm test`:

```text
Test Files  7 passed (7)
Tests      36 passed (36)
```

Los casos de aceptación quedan demostrados:

| Caso TEST DATA | Resultado |
| --- | ---: |
| 100 g × 80.000 COP/kg | 8.000 COP |
| 10 h × 0,12 kW × 1.000 COP/kWh | 1,2 kWh y 1.200 COP |
| 10 h × 500 COP/h de máquina | 5.000 COP |
| 90 min × 20.000 COP/h | 30.000 COP |
| 100 g + 10 % × 80 COP/g | 110 g y 8.800 COP |
| 100.000 con markup 50 % | 150.000 COP; utilidad 50.000; margen 33,333… % |
| 100.000 con margen objetivo 50 % | 200.000 COP; utilidad 100.000; markup 100 % |

También se cubren ceros, markup/margen cero, negativos, `NaN`, `Infinity`, strings vacíos del adaptador, margen objetivo inválido, cantidades inválidas, valores COP grandes, fracciones, redondeo comercial, metadata legacy ARS, metadata nueva COP, snapshot financiero y ausencia de ingreso real cuando solo existe una producción terminada.

## 10. Compatibilidad

- Cotizaciones nuevas usan el motor V2 y persisten snapshots COP.
- Historial, stock, producción, PDF y reportes siguen disponibles.
- Una producción `finalizada_ok` alimenta métricas estimadas, pero no crea una `Sale` ni ingreso real.
- Sin ventas registradas, `ingresosRealesTotal` es `0` y la UI muestra “Sin ventas registradas”.
- Las propiedades anteriores de métricas se conservan como alias deprecados para no romper consumidores existentes, aunque los rótulos visibles nuevos dicen “estimado”.
- El tipo `Sale` incluye todos los campos aprobados y `calculateActualSalesMetrics` queda listo para recibir ventas en una fase posterior.
- La configuración productiva COP comienza en cero. Solo los fixtures dentro de tests contienen valores colombianos de ejemplo marcados como TEST DATA.

Antes de una migración futura se puede descargar desde Configuración un JSON con:

- `calculatorBaseParams`;
- `calculatorBaseParamsV2`;
- `toyRecords`;
- `materialStock`;
- `projects`;
- `marketingProfile`.

Los valores se respaldan como strings originales de `localStorage`; no se transforman ni borran.

## 11. Verificación y riesgos pendientes

Comandos ejecutados al cierre:

### `npm run build`

Pasa. Vite transformó 3.223 módulos y generó `dist`. Permanecen advertencias no bloqueantes ya asociadas al proyecto: base de Browserslist desactualizada y un chunk principal mayor de 500 kB.

### `npm run typecheck`

Continúa fallando con 11 errores preexistentes:

- props incompatibles al usar `MakerAssistant` desde `Dashboard.tsx`;
- variable `successMessage` sin uso en `Login.tsx`;
- estrechamiento a `never` en `services/betaAccess.ts` y `services/waitlist.ts`.

Antes de la fase, el typecheck fallaba por esos mismos grupos y además por un import sin uso en Dashboard. Los errores introducidos durante esta implementación fueron corregidos; no queda un error de tipos atribuible a los módulos financieros V2.

### `npm run lint`

Continúa fallando: 35 errores y 13 advertencias, frente a 38 errores y 14 advertencias documentados antes de esta fase. Los hallazgos permanecen en archivos legacy como funciones API/Supabase, Auth, Login, Dashboard y utilidades anteriores. Predominan variables de `catch` sin uso, `any`, escapes innecesarios y reglas de hooks/fast refresh.

El lint aislado de todos los módulos nuevos, sus tests y las utilidades financieras modificadas pasa sin hallazgos. No se limpió globalmente la deuda para evitar mezclar un refactor general con la migración financiera.

### `npm test`

Pasa: 7 archivos y 36 pruebas.

### Dependencias

`npm audit` informa actualmente 30 vulnerabilidades: 3 bajas, 8 moderadas, 17 altas y 2 críticas. Antes de instalar la infraestructura de tests se habían registrado 28 y 1 crítica. Parte del aumento proviene del árbol de desarrollo de Vitest 2; la corrección sugerida para ese árbol implica Vitest 5 y un cambio mayor incompatible con el alcance conservador de esta fase. No se ejecutó `npm audit fix` ni `--force`.

Persisten riesgos que deben tratarse por separado:

- deuda de seguridad en dependencias, incluyendo `jspdf`, `xlsx`, Vite/esbuild y ahora el mocker transitivo de Vitest;
- Dashboard de gran tamaño y hooks legacy con deuda de lint;
- fórmula de fallas V1 aún presente y encapsulada;
- reportes actuales son estimaciones construidas desde producción, no contabilidad de ventas;
- no existe aún captura de costo real de producción;
- no existe restauración automática del archivo de respaldo, solo exportación segura.

## 12. Decisiones para Fase 3

Se necesita definición del negocio antes de continuar con:

1. tarifas COP reales: materiales, electricidad, mano de obra, máquina y adicionales;
2. política comercial predeterminada: markup o margen objetivo y estrategia de redondeo;
3. interfaz de múltiples tareas de mano de obra y adicionales;
4. flujo y persistencia de `Sale`, incluidos estados de pago, descuentos, comisiones y envío;
5. captura de consumo y costo real de producción;
6. rediseño V2 de fallas y progreso real;
7. tratamiento tributario colombiano, únicamente después de una decisión explícita;
8. política para reportes multi-moneda y archivo/consulta de históricos ARS;
9. plan separado de actualización de dependencias y corrección de vulnerabilidades;
10. refactor progresivo de `Dashboard.tsx` y saneamiento de typecheck/lint.

La Fase 2 se detiene aquí. No se cargaron valores reales, no se aplicaron impuestos, no se convirtieron históricos y no se construyó el módulo completo de ventas.
