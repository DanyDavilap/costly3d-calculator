# Auditoría de migración de Costly3D a Colombia

Fecha de auditoría: 2026-09-19  
Repositorio auditado: `DanyDavilap/costly3d-calculator`  
Commit auditado: `b76f2f1971ed4fd1c786df1e4d6fb98acde53293` (`main`)  
Alcance: inspección y documentación. No se modificaron fórmulas, datos, valores financieros ni migraciones.

## Resumen ejecutivo

Costly3D es hoy una aplicación React/Vite, principalmente de cliente, que calcula una cotización con material, energía, tiempo de armado, dos recargos porcentuales y una utilidad porcentual. La fórmula principal está centralizada en `src/core/calculatePrintCost.ts`, pero el resto de la lógica financiera y operativa está dispersa entre `Dashboard.tsx` y varios helpers, algunos activos y otros sin consumidores.

La aplicación está configurada de forma explícita para Argentina:

- moneda `ARS` y locale `es-AR` en UI y PDF;
- importes predeterminados compatibles con el contexto argentino, pero sin metadatos que permitan demostrar su origen o vigencia;
- ejemplos manuales con `$`;
- fechas generadas con `es-AR`;
- lenguaje de interfaz y wiki con voseo argentino;
- integración/promoción de Cafecito.

No existe conversión cambiaria y no debe agregarse. Los importes antiguos deben conservarse como históricos ARS (o archivarse, según una decisión pendiente) y los parámetros COP deben cargarse de nuevo con valores reales del negocio.

Los hallazgos económicos más importantes son:

1. `profitPercent` es **markup sobre costo**, aunque la UI y la wiki también lo llaman margen. Con 50 %, el precio es costo × 1,5; no produce margen de 50 % sobre ventas.
2. El `costPerKg` guardado en cada spool no participa en la cotización. Todas las piezas usan un único `filamentCostPerKg` global.
3. No existe costo por hora de máquina. `wearPercent` y `operationalPercent` son porcentajes sobre material + energía + armado, por lo que no representan depreciación por uso.
4. La mano de obra solo se modela como tiempo de armado; no hay tareas de postprocesado, tarifas por tarea ni costos planos asociados.
5. No existen impuestos, descuentos, comisiones, envío, empaque, soportes ni desperdicio planificado como conceptos separados.
6. Los reportes llaman ingreso al precio sugerido de una producción finalizada. No se registra precio realmente cobrado, venta, descuento, devolución ni pago.
7. Hay dos mediciones incompatibles del material de una impresión fallida: una usa el total planificado y otra lo multiplica por el porcentaje impreso.
8. No hay moneda, país, locale, zona horaria ni versión del modelo dentro de los registros históricos.
9. Los datos de costos, stock, cotizaciones, producción, proyectos y preferencias viven en `localStorage`; Supabase solo se usa para acceso/lista beta.
10. No existe infraestructura de tests ni tests matemáticos. El build de producción pasa, pero `typecheck` y `lint` fallan en el estado auditado.

Conclusión: la arquitectura actual sirve como base para una calculadora sencilla, pero **todavía no puede responder con confiabilidad cuánto cuesta realmente fabricar y vender una pieza**. Debe conservarse el núcleo puro de cálculo, ampliarlo mediante conceptos explícitos y separar cotización, producción y venta real.

## 1. Estado actual de Costly3D

### Stack y ejecución

- React 18 + TypeScript + Vite.
- UI y flujo principal concentrados en `src/pages/Dashboard/Dashboard.tsx` (6.963 líneas).
- Cálculo central puro en `src/core/calculatePrintCost.ts`.
- Persistencia operativa en navegador mediante `localStorage`.
- Supabase para autenticación/perfiles beta y tabla `beta_waitlist`, no para datos financieros.
- PDF mediante `jspdf`; Excel mediante `xlsx`.
- No existe dependencia, script ni directorio de tests.

### Estado de verificación en el commit auditado

| Comando | Resultado | Observación |
|---|---:|---|
| `npm ci` | pasa | 368 paquetes instalados; el audit reporta 28 vulnerabilidades. |
| `npm run build` | pasa | Vite genera el bundle; advierte un chunk de ~1,67 MB. |
| `npm run typecheck` | falla | Errores preexistentes en Dashboard, Login y servicios beta/waitlist. |
| `npm run lint` | falla | 38 errores y 14 advertencias preexistentes. |
| `npm audit` | riesgo | 3 bajas, 7 moderadas, 17 altas y 1 crítica; entre las directas figuran `jspdf`, `postcss`, `react-router-dom`, `vite` y `xlsx`. |

La vulnerabilidad de dependencias no es parte del cambio financiero, pero debe resolverse antes de considerar la aplicación una herramienta operativa con datos reales.

### Funcionalidad financiera visible

- Calculadora de cotizaciones.
- Historial de cotizaciones y producciones.
- Stock por spool y descuento de gramos al iniciar producción.
- Registro de producción OK o fallida.
- Reporte mensual, rentabilidad, fallas y consumo.
- PDF de cotización, PDF mensual y Excel.
- Comparador de escenarios implementado pero desactivado (`ENABLE_COMPARATOR = false`).
- Secciones anunciadas de costos fijos/amortización, pero todavía no implementadas.

## 2. Arquitectura relevante

### Camino activo

```text
Formulario Dashboard
  -> PricingInputs + PricingParams
  -> pricingCalculator()
  -> calculatePrintCost()
  -> PricingBreakdown
  -> HistoryRecord en localStorage
  -> estado cotizada / en producción / finalizada
  -> calculateMonthlyMetrics()
  -> paneles, PDF y Excel
```

### Archivos y responsabilidades

| Archivo | Responsabilidad actual | Estado |
|---|---|---|
| `src/core/calculatePrintCost.ts` | Fórmula de cotización principal y redondeo. | Activo y central. |
| `src/utils/pricingCalculator.ts` | Adaptador del núcleo a nombres usados por Dashboard. | Activo. |
| `src/pages/Dashboard/Dashboard.tsx` | Formularios, defaults, persistencia, stock, fallas, reportes, formatos y exportación de cotizaciones. | Activo; excesivamente monolítico. |
| `src/utils/monthlyMetrics.ts` | Métricas mensuales activas de ingresos, costos, fallas y margen. | Activo. |
| `src/utils/consumoImpresiones.ts` | Consumo estimado en impresiones completas/fallidas. | Activo. |
| `src/utils/escenariosComparadorV1.ts` | Simulación de lotes y fallas esperadas. | Se calcula, pero la UI está desactivada. |
| `src/utils/pdfTheme.ts` | Formato monetario/fecha de PDF de cotización. | Activo; ARS/es-AR hardcodeado. |
| `src/utils/reporteExports.ts` | Exportación mensual PDF/Excel. | Activo; ARS/es-AR hardcodeado en PDF. |
| `src/utils/costCalculator.ts` | Segundo adaptador del núcleo. | Sin consumidores. |
| `src/utils/profitability.ts` | Cálculo alternativo de rentabilidad. | Sin consumidores. |
| `src/utils/analisisRentabilidad.ts` | Modelo alternativo con asignación de costos fijos. | Sin consumidores. |
| `src/utils/comparadorEscenarios.ts` | Comparador alternativo con costos fijos. | Sin consumidores. |
| `src/utils/reporteMensual.ts` | Generador alternativo de reporte mensual. | Sin consumidores. |
| `src/pages/Landing/Landing.tsx` | Marketing y preview de importes. | Activo; importes manuales y voseo. |
| `src/wiki/**` | Definiciones y ayuda. | Activo desde Dashboard; contradice el significado real de `profitPercent`. |
| `supabase/migrations/20260204170000_create_beta_waitlist.sql` | Única migración SQL. | No contiene datos financieros. |

### Observación de enrutamiento

`src/routes/router.tsx` declara páginas separadas, pero `src/main.tsx` monta `App` dentro de `BrowserRouter` y `App.tsx` renderiza directamente `Dashboard` o `Landing`; no usa el router declarado. Para la migración importa el Dashboard monolítico, no las páginas placeholder `Items`, `Reportes`, `Faltantes` o `Configuracion`.

## 3. Flujo completo de cálculos actual

### Datos ingresados

En `src/pages/Dashboard/Dashboard.tsx`:

- producto y categoría;
- horas/minutos de impresión;
- horas/minutos de armado;
- gramos de material;
- spool opcional, usado para stock y trazabilidad, no para fijar el costo del material;
- costo global de filamento por kg;
- potencia en W;
- precio de energía por kWh;
- valor de armado por hora;
- porcentajes de desgaste, operativo y utilidad.

`getInputs()` convierte horas/minutos del formulario a minutos. `handleParamChange()` convierte cada parámetro con `parseFloat` y usa cero cuando el valor no es numérico.

### Costos directos

`pricingCalculator()` delega en `calculatePrintCost()`:

```text
horas_impresión = minutos_impresión / 60
horas_armado = minutos_armado / 60
kg_material = gramos_material / 1000

costo_material = kg_material × costo_filamento_por_kg
costo_energía = (potencia_W / 1000) × horas_impresión × precio_kWh
costo_mano_obra = horas_armado × valor_hora_armado
```

### Costo de fabricación actual

```text
costo_base = costo_material + costo_energía + costo_mano_obra
desgaste = costo_base × porcentaje_desgaste / 100
operativo = costo_base × porcentaje_operativo / 100
subtotal = costo_base + desgaste + operativo
```

`subtotal` es el valor que la UI llama “Costo total” y que el modelo guarda como `breakdown.totalCost`.

### Markup, precio sugerido y utilidad

```text
utilidad = subtotal × profitPercent / 100
precio_final = subtotal + utilidad
precio_sugerido = precio_final
```

Aunque se usa la palabra margen en PDF/wiki, la operación es markup sobre costo.

### Persistencia y producción

`saveCalculation()` crea o actualiza un `HistoryRecord` con snapshot de inputs, parámetros y desglose. El registro nace como `cotizada`. Al confirmarlo pasa a `in_production`; al iniciar producción descuenta del spool todos los gramos planificados. Al terminar:

- `finalizada_ok`: conserva el descuento completo;
- `finalizada_fallida`: calcula pérdida proporcional al porcentaje impreso y devuelve al stock la porción no usada.

### Reportes y rentabilidad

Solo las producciones `finalizada_ok` y `finalizada_fallida` entran a `calculateMonthlyMetrics()`.

- Una producción OK genera ingreso igual al precio sugerido guardado, multiplicado por cantidad.
- Una producción fallida genera ingreso cero y pérdida según `failure.lostCost` o sus fallbacks.
- Rentabilidad neta = ingresos − costo de producciones OK − pérdidas por fallas.
- Margen neto = rentabilidad neta / ingresos.

No hay entidad venta ni precio cobrado. Por eso “ingresos” significa actualmente “precio sugerido de producciones marcadas OK”.

## 4. Tabla de fórmulas encontradas

### Núcleo de cotización activo

| Archivo / función | Inputs | Fórmula real | Unidad de salida | Dónde se muestra |
|---|---|---|---|---|
| `src/core/calculatePrintCost.ts` / `minutesToHours` | minutos | `minutos / 60` | horas | Tiempo estimado y cálculos internos. |
| mismo / `gramsToKg` | gramos | `gramos / 1000` | kg | Interno. |
| mismo / `calculatePrintCost` | gramos, precio/kg | `(gramos / 1000) × precioKg` | dinero | Desglose “Costo material”, PDF y reportes. |
| mismo / `calculatePrintCost` | W, horas, precio/kWh | `(W / 1000) × horas × precioKWh` | dinero | “Costo energía”, PDF y fallas. |
| mismo / `calculatePrintCost` | minutos armado, tarifa/h | `(minutos / 60) × tarifaHora` | dinero | “Costo armado” / “Mano de obra”. |
| mismo / `calculatePrintCost` | tres costos directos | `material + energía + manoObra` | dinero | Solo interno como `baseCost`. |
| mismo / `calculatePrintCost` | base, desgaste % | `base × desgaste / 100` | dinero | “Desgaste”; PDF lo agrupa como uso/mantenimiento. |
| mismo / `calculatePrintCost` | base, operativo % | `base × operativo / 100` | dinero | “Operativo”; PDF lo agrupa como uso/mantenimiento. |
| mismo / `calculatePrintCost` | base y recargos | `base + desgaste + operativo` | dinero | “Subtotal” y “Costo total”; `totalCost`. |
| mismo / `calculatePrintCost` | subtotal, `profitPercent` | `subtotal × profitPercent / 100` | dinero | “Ganancia esperada” / “Utilidad estimada”. |
| mismo / `calculatePrintCost` | subtotal, utilidad | `subtotal + utilidad` | dinero | “Total final” / “Precio sugerido”. |
| mismo / `roundCurrency` | cualquier resultado | `round(value, 2)` | dinero con 2 decimales internos | Todos los campos retornados. |

La UI usa `src/utils/pricingCalculator.ts` como adaptador. `totalCost` equivale a `subtotal`; `finalPrice` equivale a `totalFinal`.

### Fallas y stock activos

| Archivo / función | Fórmula real | Observación |
|---|---|---|
| `Dashboard.tsx` / `getRequiredGramsForRecord` | `materialGramsUsed` si es positivo; si no, `inputs.materialGrams × quantity` | Puede mezclar total de lote y valor unitario según el origen del registro. |
| `Dashboard.tsx` / `handleConfirmFailure` | `lostGrams = requiredGrams × percentPrinted / 100` | Correcto como aproximación lineal si el flujo es uniforme. |
| mismo | `lostCost = totalCost × percentPrinted / 100` | Escala material, energía, mano de obra, desgaste y operativo con el avance. Es una decisión contable no explicitada. |
| mismo | `materialCostLost = materialCost × percentPrinted / 100` | Desglose parcial. |
| mismo | `energyCostLost = energyCost × percentPrinted / 100` | Desglose parcial. |
| mismo | `gramsRecovered = requiredGrams - lostGrams` | Se devuelve al stock la parte no impresa. |
| `src/utils/consumoImpresiones.ts` / `calcularConsumoImpresiones` | terminada: consume 100 %; fallida: tiempo, material y “energía” × avance | El campo energía recibe costo monetario, no kWh. |

### Métricas mensuales activas

| Archivo / función | Fórmula real | Unidad / significado |
|---|---|---|
| `src/utils/monthlyMetrics.ts` / `resolveQuantity` | cantidad positiva; de lo contrario 1 | unidades lógicas. |
| mismo / `resolveUnitPrice` | `record.total`, si no `finalPrice`, si no 0 | dinero por unidad sugerido. |
| mismo / `resolveCostPerUnit` | `breakdown.totalCost` o 0 | costo por unidad. |
| mismo / `calculateMonthlyMetrics` | OK: `revenue = unitPrice × quantity` | ingreso supuesto, no venta real. |
| mismo | OK: `costSales = costPerUnit × quantity` | costo de unidades OK. |
| mismo / `resolveFailureCost` | `lostCost`; si no, material perdido + energía perdida + mano de obra perdida; si no, costo unitario × cantidad | costo de falla con fallbacks heterogéneos. |
| mismo | `itemNet = revenue - (costSales + failureCost)` | utilidad/pérdida del registro. |
| mismo | `net = ingresos - costosVentas - pérdidasFallas` | rentabilidad neta mensual. |
| mismo | `margen = net / ingresos × 100` | margen real sobre ingresos. |
| mismo | `tasaFallas = failedCount / (okCount + failedCount) × 100` | porcentaje por registros, no por `quantity`. |
| `Dashboard.tsx` / agrupación `rentabilidadData` | por producto: ingreso − costo; margen = ganancia / ingreso | rankings y marketing. |

### Comparador v1 (calculado pero UI desactivada)

En `src/utils/escenariosComparadorV1.ts`:

```text
fallidas = cantidad × porcentajeFallos / 100
ok = cantidad - fallidas
factor_falla = porcentajeImpresoFallida / 100
material_perdido = fallidas × gramosPorImpresion × factor_falla
material_total = ok × gramosPorImpresion + material_perdido
costo_material = material_total × costoMaterialPorGramo
costo_energía = ok × costoEnergiaPorImpresion
              + fallidas × costoEnergiaPorImpresion × factor_falla
costo_total = costo_material + costo_energía
ingresos = ok × precioUnitario
ganancia = ingresos - costo_total
margen = ganancia / ingresos × 100
```

Es un modelo de valor esperado: permite cantidades fraccionarias de impresiones OK/fallidas y omite mano de obra, desgaste, operativo y máquina.

### Helpers alternativos no conectados

- `src/utils/profitability.ts`: calcula ingreso, costo, ganancia y margen para todos los registros recibidos, sin filtrar estados. Si se conectara directamente a todo el historial podría tratar cotizaciones como ventas.
- `src/utils/analisisRentabilidad.ts`: asigna costos fijos proporcionalmente a ingresos o cantidades. No está conectado y no deja claro si costos variables son unitarios o totales.
- `src/utils/comparadorEscenarios.ts`: otro comparador, incompatible con v1, con un `porcentajeCompletado` aplicado a tiempo/filamento/energía y costos fijos opcionales.
- `src/utils/reporteMensual.ts`: reporte alternativo no usado; calcula `neto = ingresos - costosVentas` y no descuenta `costosFallos`, aunque muestra las fallas por separado.
- `src/utils/costCalculator.ts`: wrapper redundante de `calculatePrintCost()`.

## 5. Configuración monetaria actual

No hay configuración central de país o moneda. Existen tres formatters independientes:

1. `Dashboard.tsx` / `formatCurrency`: `Intl.NumberFormat("es-AR", { currency: "ARS", minimumFractionDigits: 0 })`.
2. `src/utils/pdfTheme.ts` / `formatMoney`: locale `es-AR`, moneda predeterminada `ARS`.
3. `src/utils/reporteExports.ts` / `formatMoney`: `es-AR` + `ARS`; también crea formatters separados para números y porcentajes.

Además:

- el preview de Landing escribe cadenas manuales como `$ 12.450`;
- los labels usan `Filamento $/kg`, `Costo kWh ($)` y `Armado $/hora`;
- las fechas se generan con `toLocaleDateString("es-AR")` en varios lugares;
- no hay `country`, `currency`, `locale` ni `timezone` en `.env`, configuración, registros o base de datos;
- no hay metadatos de moneda en PDF/Excel ni en `HistoryRecord`.

## 6. Valores argentinos encontrados y clasificación

No aparece la palabra “Argentina” en datos de negocio ni una tasa ARS/COP. La clasificación como argentina se basa en el `ARS`/`es-AR` explícito y en que esos valores se presentan bajo esa moneda.

| Ubicación | Valor | Clasificación | Acción futura |
|---|---:|---|---|
| `Dashboard.tsx` / `DEFAULT_PARAMS.filamentCostPerKg` | 30.000 | costo base ARS/kg | Reemplazar por valor COP confirmado; no convertir. |
| mismo / `energyCostPerKwh` | 100 | tarifa base ARS/kWh | Reemplazar por tarifa COP configurable; no convertir. |
| mismo / `laborPerHour` | 1.000 | tarifa base ARS/h | Reemplazar por tarifa COP confirmada; no convertir. |
| mismo / `wearPercent` | 5 % | supuesto económico | Confirmar modelo; no depende de moneda, pero puede desaparecer al introducir costo/h de máquina. |
| mismo / `operationalPercent` | 5 % | supuesto económico | Confirmar base y alcance. |
| mismo / `profitPercent` | 40 % | markup predeterminado | Confirmar objetivo y nombre. |
| `Dashboard.tsx` / escenarios iniciales | precios 6.000/7.000; material 28/30 por g; energía 160/180 | ejemplos monetarios ARS | Sustituir por fixtures COP explícitos o neutralizarlos cuando se reactive el comparador. |
| `Dashboard.tsx` / nuevo escenario | 6.000, 30/g, 180 | defaults ARS | Igual que arriba. |
| `Landing.tsx` | `$ 12.450`, `$ 1.080`, `$ 2.500`, `$ 22.900` | demo manual | Reescribir con formatter y fixture colombiano confirmado; no convertir. |
| registros existentes en `toyRecords` | importes variables | históricos calculados en ARS por la versión actual | Preservar y etiquetar como legacy ARS; nunca recalcular silenciosamente con COP. |
| `calculatorBaseParams` | importes variables | preferencias ARS del navegador | Respaldar y migrar a un perfil COP nuevo; no interpretar el mismo número como COP. |

Los demo records no guardan precios colombianos ni argentinos fijos propios: se recalculan con los parámetros activos al ejecutar `loadDemoSeeds()`. Por eso deben regenerarse solo después de definir fixtures COP.

## 7. Hardcodes y números mágicos

### Financieros y de localización

- Defaults de costos y porcentajes en `Dashboard.tsx`.
- Importes de escenarios en `Dashboard.tsx`.
- Importes del preview en `Landing.tsx`.
- `ARS` y `es-AR` repetidos en Dashboard, `pdfTheme.ts` y `reporteExports.ts`.
- Símbolo `$` incrustado en labels.
- Fechas `es-AR` repetidas en creación, duplicación, fallas, seeds y PDFs.
- `PLA` hardcodeado en el resultado (`"{gramos} g PLA"`) incluso si se elige PETG, ABS, TPU, resina u otro material.

### Umbrales de analítica/recomendaciones

En `Dashboard.tsx`: 30 días, 4,3 semanas/mes, demanda alta desde 20 intentos, estable desde 8, capacidad al 90 %/60 %, tolerancia de margen ±5 puntos, filtro de venta con 80 % del objetivo y fallas ≤20 %, pausa por 25 %, mejora por 15 %, alertas de fallas desde 10 % y oportunidades por menos de 20 horas. Son reglas de producto, no verdades financieras, y necesitan nombre/configuración o documentación.

### Otros

- El porcentaje de falla se limita a 99 %, no 100 %.
- El fallback de margen objetivo de marketing es 20 %.
- Los registros sin cantidad válida se tratan como cantidad 1 en métricas.
- El reporte exportado redondea varios valores a enteros antes de escribirlos.

## 8. Problemas matemáticos y de modelo

### Críticos

#### 8.1 Margen y markup están confundidos

`profitPercent` se aplica así:

```text
precio = costo × (1 + porcentaje / 100)
```

Eso es markup. Sin embargo:

- el PDF dice “Margen aplicado”;
- la wiki dice que el precio se calcula con margen;
- la wiki define correctamente margen como ganancia/ingreso;
- el panel muestra “Utilidad (%)”.

Con costo 100.000 y `profitPercent = 50`, la app entrega 150.000. La utilidad es 50.000 y el margen real es 33,33 %, no 50 %. Para margen objetivo de 50 %, el precio debería ser `100.000 / (1 - 0,50) = 200.000`.

#### 8.2 El costo del spool se captura pero no se usa

`MaterialSpool.costPerKg` se carga, guarda y edita, pero `calculatePrintCost()` siempre recibe `params.filamentCostPerKg`. Elegir un spool no actualiza el costo. La wiki afirma que el stock permite calcular costo real por gramo, pero el código no lo hace.

#### 8.3 No existe costo por tiempo de máquina

La electricidad sí depende de horas de impresión. El desgaste depende de `baseCost`, incluyendo material y mano de obra:

```text
desgaste = (material + energía + manoObra) × porcentaje
```

Dos trabajos con las mismas horas de máquina pero distinto material generan distinto “desgaste”. Esto no representa depreciación, mantenimiento ni uso por hora.

#### 8.4 Ingresos no son ventas reales

Marcar una producción OK hace que el reporte reconozca el precio sugerido completo como ingreso. No existe precio final negociado, cantidad vendida separada, fecha de venta, descuento, impuesto, comisión, devolución ni estado de pago. Las métricas de ingreso/utilidad son estimaciones, no contabilidad real.

#### 8.5 Consumo de material fallido inconsistente

`monthlyMetrics.resolveGramsUsed()` toma el total planificado incluso para una falla, mientras `calcularConsumoImpresiones()` multiplica el material por el porcentaje impreso. Así, “gramos consumidos” puede mostrar 100 g en un reporte y 40 g en otro para la misma falla al 40 %. El stock sigue el segundo criterio.

### Altos

#### 8.6 Costo de falla proporcional ambiguo

`lostCost = totalCost × porcentajeImpreso`. Esto prorratea también armado, desgaste y operativo. El armado/postprocesado podría no haberse realizado; algunos costos operativos podrían ser fijos por intento. Se requiere una política por componente.

#### 8.7 Tasa de fallas mezcla registros y unidades

`monthlyMetrics` cuenta un registro como un intento sin considerar `quantity`, pero el módulo de marketing suma `item.quantity`. Un lote de 10 unidades puede ser una falla en una vista y 10 en otra.

#### 8.8 Cantidad y costos unitarios no tienen contrato estable

Los registros nuevos siempre tienen `quantity = 1`, pero el modelo soporta otros valores heredados. `materialGramsUsed` a veces representa el total y otras veces se deriva de gramos unitarios × cantidad. Esto expone a doble multiplicación o subestimación al ampliar lotes.

#### 8.9 Redondeo fragmentado

El núcleo calcula con `number` y devuelve cada componente redondeado a 2 decimales, pero calcula subtotal/final con valores anteriores al redondeo. La suma visual de componentes puede diferir centavos del subtotal. Luego la UI oculta decimales y los exports redondean algunos campos a cero decimales. No hay una política única de precisión.

#### 8.10 Sin moneda en datos históricos

Un mismo número no permite saber si es ARS o COP tras la migración. Cambiar solo el formatter reinterpretaría silenciosamente datos antiguos.

### Medios

- `reporteMensual.ts`, hoy sin uso, no resta costos de fallas de su neto.
- `profitability.ts`, hoy sin uso, no filtra por estado y podría convertir cotizaciones en ingresos.
- Hay fórmulas duplicadas de rentabilidad en `monthlyMetrics.ts`, `profitability.ts`, `analisisRentabilidad.ts`, `reporteMensual.ts` y `Dashboard.tsx`.
- El costo de energía y el consumo energético físico están mezclados: el campo `energiaTotalConsumida` contiene dinero, no kWh.
- No se valida en el núcleo que los inputs sean finitos/no negativos; la validación vive en Dashboard. Otros consumidores podrían llamar el núcleo con negativos o `NaN`.
- El formato Excel escribe números sin moneda/configuración y sin declarar COP/ARS en el documento.
- El tiempo de reporte es estimado, no real: usa minutos cotizados, aunque existen `startedAt`/`completedAt`.
- Hay mojibake en varias cadenas (`Cotización`, `Configuración`, etc.) de archivos concretos; debe corregirse junto con la revisión de UX, sin alterar datos.

## 9. Costo, utilidad, markup y margen actuales

| Concepto | Significado correcto | Implementación actual |
|---|---|---|
| Costo directo/base | material + energía + trabajo directo | `baseCost`; correcto para esos tres componentes, aunque incompleto. |
| Costo de producción | costos necesarios para fabricar antes de ganancia | `subtotal` / `totalCost`; incluye desgaste y operativo porcentuales. |
| Markup | ganancia como % del costo | Es exactamente lo que hace `profitPercent`. |
| Utilidad esperada | precio − costo | `profit`; correcta respecto de la fórmula de markup. |
| Margen bruto | utilidad / precio de venta | No se calcula en la cotización; sí se calcula en reportes. |
| Precio sugerido | costo + utilidad | `finalPrice`; matemáticamente coherente con markup. |
| Ganancia real | ingreso real − costos reales | No disponible porque no hay venta/precio cobrado ni costos reales posteriores. |

Nomenclatura recomendada:

- renombrar el comportamiento actual a **“Recargo sobre costo (markup)”**;
- mostrar simultáneamente el **“Margen bruto resultante”**;
- si se permite fijar margen objetivo, usar `precio = costo / (1 - margen)` y bloquear margen ≥100 %;
- reservar “ganancia real” y “margen real” para ventas registradas, no cotizaciones.

## 10. Estado de métricas

| Métrica | Estado | Confiabilidad actual |
|---|---|---|
| Costo material cotizado | Disponible | Media: fórmula correcta, pero usa costo global y no el spool elegido. |
| Costo energía cotizado | Disponible | Alta si potencia, horas y tarifa son reales. |
| kWh consumidos | No disponible | Solo se calcula costo monetario; no se persiste kWh. |
| Costo mano de obra | Parcial | Solo armado; no tareas ni postproceso detallado. |
| Costo máquina/hora | No disponible | Desgaste porcentual no lo sustituye. |
| Depreciación/mantenimiento | Aproximación | Baja: porcentaje de costos directos, no horas de máquina. |
| Costo de producción | Disponible, incompleto | Media-baja: faltan conceptos y hay supuestos porcentuales. |
| Precio sugerido | Disponible | Coherente con markup; nomenclatura ambigua. |
| Utilidad cotizada | Disponible | Coherente con markup, no es ganancia real. |
| Ingresos | Estimado | Baja para gestión real: usa precio sugerido al finalizar producción. |
| Ganancia/rentabilidad mensual | Estimada | Media-baja: depende de ingresos supuestos y fallas prorrateadas. |
| Margen mensual | Disponible | Fórmula correcta sobre los datos disponibles; los datos base no son ventas reales. |
| Consumo material OK | Disponible | Media: usa gramos planificados. |
| Consumo material fallido | Inconsistente | Baja: dos caminos arrojan valores distintos. |
| Tasa de fallas | Disponible | Baja para lotes: unas vistas cuentan registros y otras cantidades. |
| Producción/horas | Estimada | Usa duración cotizada, no duración real. |

## 11. Estado de base de datos y persistencia

### Supabase

La única tabla versionada es `public.beta_waitlist`, con email, estado beta y timestamps. No hay tablas de:

- configuración económica;
- materiales o compras;
- cotizaciones;
- producciones;
- ventas;
- costos;
- monedas;
- reportes.

No hay seeds/fixtures SQL financieros. No se ejecutó ninguna migración.

### localStorage y sessionStorage

| Clave | Contenido | Relevancia de migración |
|---|---|---|
| `calculatorBaseParams` | costos globales y porcentajes | Contiene valores ARS sin currency. Crítica. |
| `toyRecords` | cotizaciones, producciones, snapshots y fallas | Histórico financiero sin currency/modelVersion. Crítica. |
| `materialStock` | spools, gramos y `costPerKg` opcional | Precio sin currency; `costPerKg` no se usa. Crítica. |
| `stockByProduct` | mapa derivado de cantidades cotizadas | Parece legado; solo se escribe, no se lee. Revisar antes de retirar. |
| `calculatorCategory` | categoría | No monetaria. |
| `projects` | proyectos/piezas/gramos/tiempo | No guarda costos; deberá snapshotear contexto al cotizar. |
| `marketingProfile` | negocio, capacidad y margen objetivo | `targetMargin` sí tiene semántica financiera. |
| `costly3d_brand` | marca/PDF | No monetaria. |
| `maker-assistant-history` | historial de asistente | No monetaria. |
| claves de auth/dev/tema | acceso/preferencias | No monetarias. |

Los precios son `number` de JavaScript serializados a JSON (IEEE-754), sin escala decimal, moneda, fuente, fecha de vigencia ni versión de fórmula.

### Preservación recomendada

Antes de cualquier segunda fase:

1. exportar un backup completo de todas las claves financieras;
2. crear una migración no destructiva y versionada;
3. mantener snapshots antiguos sin recalcular;
4. marcar registros legados como ARS o `legacy-ARS` después de confirmación;
5. crear un perfil COP nuevo, sin copiar importes;
6. soportar lectura dual mientras se valida la migración;
7. no borrar las claves antiguas hasta verificar conteos y totales.

## 12. Componentes afectados por la migración

### Cambio obligatorio

- `src/core/calculatePrintCost.ts`: contrato del modelo, precisión y nuevos componentes.
- `src/utils/pricingCalculator.ts`: DTO/adaptador.
- `src/pages/Dashboard/Dashboard.tsx`: defaults, formularios, labels, stock, fallas, fechas, reports y formatters.
- `src/utils/monthlyMetrics.ts`: semántica de ventas, fallas, cantidades y consumo.
- `src/utils/consumoImpresiones.ts`: separar kWh de costo de energía.
- `src/utils/pdfTheme.ts`: configuración central y COP/es-CO.
- `src/utils/reporteExports.ts`: formatter, metadata de moneda y redondeo.
- `src/pages/Landing/Landing.tsx`: ejemplos monetarios y lenguaje.
- `src/wiki/content/*.md` y `src/wiki/pro/*.md`: terminología financiera y lenguaje colombiano/neutral.
- tipos de `HistoryRecord`, `MaterialSpool`, fallas y futuras ventas.
- estrategia de persistencia/migración de localStorage.

### Revisar, consolidar o retirar

- `costCalculator.ts`;
- `profitability.ts`;
- `analisisRentabilidad.ts`;
- `comparadorEscenarios.ts`;
- `escenariosComparadorV1.ts`;
- `reporteMensual.ts`;
- `routes/router.tsx` y páginas placeholder.

### Sin impacto financiero directo

- APIs de waitlist/auth;
- Maker Assistant, salvo locale/textos;
- branding visual;
- tabla Supabase `beta_waitlist`.

## 13. Cobertura del modelo de costos solicitado

| Componente objetivo | Soporte actual | Brecha |
|---|---|---|
| Precio rollo/botella | No | Solo costo/kg opcional y gramos disponibles. |
| Cantidad comprada | Parcial | Gramos disponibles, no cantidad inicial/compra/lote. |
| Costo por kg/gramo | Parcial | Global activo; por spool se almacena pero no se usa. |
| Gramos usados | Sí | Planificados; inconsistencia en fallas. |
| Soportes/desperdicio adicional | No | Deben modelarse aparte del peso neto. |
| Porcentaje adicional material | No | No existe. |
| FDM y resina | Parcial | La lista incluye Resin, pero el dominio/labels siguen diciendo filamento/spool/kg. |
| Electricidad | Sí | Fórmula correcta y tarifa configurable; falta guardar kWh. |
| Costo/h de máquina | No | Debe agregarse sin reutilizar desgaste porcentual. |
| Mano de obra | Parcial | Solo armado con una tarifa global. |
| Postprocesado | Parcial conceptual | Puede forzarse dentro de armado, pero no queda trazabilidad. |
| Empaque | No | No hay line item. |
| Costos adicionales | No en cotización | Existen campos solo en helpers no conectados. |
| Costos indirectos/fijos | Muy parcial | Un porcentaje operativo; helper de costos fijos sin UI. |
| Riesgo/fallos esperados | Solo histórico/simulación | No se incorpora como contingencia explícita en la cotización. |
| Impuestos | No | Requiere política y configuración. |
| Descuentos | No | Solo mención en wiki. |
| Comisiones | No | Sin soporte. |
| Envío/transporte | No | Sin soporte. |

## 14. Propuesta de arquitectura Colombia

### 14.1 Contexto regional como única fuente de verdad

Crear un módulo de configuración, por ejemplo `src/config/regional.ts`, con un contrato equivalente a:

```ts
type RegionalConfig = {
  country: "CO";
  currency: "COP";
  locale: "es-CO";
  timeZone: "America/Bogota";
  moneyFractionDigits: 0;
};
```

No es necesario construir un sistema i18n completo. Sí se debe:

- importar la misma configuración desde UI, PDF, Excel y fechas;
- centralizar `formatMoney`, `formatNumber`, `formatPercent` y `formatDate`;
- producir de forma natural `$ 32.000`/equivalente tipográfico de `Intl`, sin decimales en presentación COP;
- conservar precisión interna y redondear solo en límites definidos;
- guardar currency/locale/modelVersion en cada snapshot financiero.

Para una futura extensión a ARS/MXN/USD basta que `RegionalConfig` sea inyectable. No se necesitan ahora catálogos de países, conversiones ni tasas de cambio.

### 14.2 Dominio de costos explícito

Separar conceptos y no reutilizar porcentajes ambiguos:

```text
material neto
+ soportes/material auxiliar
+ desperdicio planificado
= costo material

kWh × tarifa kWh = electricidad
horas máquina × tarifa máquina/h = uso de máquina
Σ(horas tarea × tarifa laboral) = mano de obra
Σ(costos planos postproceso/empaque/otros) = adicionales directos
+ indirectos asignados
+ contingencia/riesgo (si se decide)
= costo de producción estimado
```

El costo/h de máquina debe ser un campo independiente. En una primera versión puede ser una tarifa manual calculada fuera del cotizador. Más adelante puede derivarse de compra, vida útil, horas utilizables, mantenimiento y repuestos, sin cambiar el contrato del cotizador.

### 14.3 Materiales y compras

El material debería representar:

- tecnología/tipo y unidad base;
- cantidad comprada;
- costo total de compra;
- costo unitario derivado;
- currency y fecha de vigencia;
- lote/spool/botella;
- stock restante.

La cotización debe snapshotear el costo unitario usado. Cambiar el precio del stock futuro no debe reescribir cotizaciones anteriores.

### 14.4 Cotización, producción y venta

Separar entidades:

- **Cotización:** costo estimado, markup/margen objetivo y precio sugerido.
- **Producción:** consumos y tiempos reales, OK/falla/reproceso.
- **Venta:** cantidad vendida, precio cobrado, descuentos, comisiones, impuestos, envío, fecha/pago.

Solo una venta debe generar ingresos reales. Una pieza OK puede terminar en inventario sin generar ingreso.

### 14.5 Precisión

- No formatear ni redondear durante cada paso.
- Usar aritmética decimal explícita o una política de unidades menores/documentada.
- Mantener suficiente escala para tarifas por gramo/kWh.
- Redondear el precio facturable COP a pesos al final, según regla confirmada.
- Guardar valores calculados y entradas originales para auditoría.

## 15. Plan de migración por fases

### Fase 0 — Congelar y respaldar

- Etiquetar el commit actual.
- Exportar `calculatorBaseParams`, `toyRecords`, `materialStock`, `projects` y `marketingProfile`.
- Registrar conteos y totales de control.
- No convertir ni recalcular registros.

### Fase 1 — Contrato matemático y tests

- Configurar Vitest u otro runner compatible.
- Escribir tests de caracterización del comportamiento actual.
- Escribir tests del comportamiento matemático objetivo por componente.
- Acordar markup/margen, fallas, redondeo y cantidad.
- Hacer que build, typecheck y lint tengan una línea base controlada.

### Fase 2 — Configuración regional central

- Introducir CO/COP/es-CO/America/Bogota como configuración única.
- Centralizar formatters.
- Actualizar UI/PDF/Excel/fechas/landing.
- Mantener formato legacy al visualizar registros ARS.

### Fase 3 — Migración no destructiva de datos

- Introducir `schemaVersion`, `currency`, `locale`, `calculationModelVersion` y snapshots.
- Lectura dual de registros v1/v2.
- Marcar históricos ARS sin convertir.
- Crear perfil COP vacío o con valores ingresados por el usuario.
- Verificar conteos/checksums antes de retirar rutas legacy.

### Fase 4 — Modelo de costo real

- Conectar costo del material seleccionado.
- Separar electricidad y máquina/h.
- Modelar mano de obra por tareas.
- Añadir soportes, desperdicio y adicionales.
- Definir costos indirectos y riesgo sin doble conteo.

### Fase 5 — Pricing y ventas

- Renombrar markup actual.
- Agregar margen objetivo si se confirma.
- Mostrar markup y margen resultante juntos.
- Separar precio sugerido de precio vendido e ingresos reales.
- Incorporar descuentos/comisiones/impuestos/envío solo con reglas confirmadas.

### Fase 6 — Métricas y persistencia

- Unificar helpers duplicados.
- Corregir consumo/fallas/cantidades.
- Distinguir estimado vs real.
- Diseñar tablas financieras en Supabase si se decide sincronización multi-dispositivo.
- Mantener historial inmutable/auditable.

### Fase 7 — UX Colombia y cierre

- Revisar voseo, Cafecito, labels, ejemplos, tooltips, onboarding y wiki.
- Corregir mojibake.
- Validar PDFs/Excel con COP.
- Pruebas de regresión y reconciliación de historiales.

## 16. Tests matemáticos propuestos

No se agregaron tests en esta fase porque el repositorio no tiene runner configurado. Los siguientes casos deben convertirse en tests unitarios antes de modificar el motor.

### Componentes individuales

| Caso | Inputs | Resultado matemático esperado |
|---|---|---:|
| Material COP | 100 g, 80.000 COP/kg | 8.000 COP |
| Costo por gramo | rollo 1.000 g por 80.000 COP | 80 COP/g |
| Electricidad | 0,12 kW, 10 h, 1.000 COP/kWh | 1.200 COP |
| Máquina (futuro) | 10 h, 500 COP/h | 5.000 COP |
| Mano de obra | 1,5 h, 20.000 COP/h | 30.000 COP |
| Desperdicio | 100 g netos + 10 %, 80 COP/g | 8.800 COP de material |
| Markup | costo 100.000, markup 50 % | precio 150.000; utilidad 50.000; margen 33,333... % |
| Margen objetivo | costo 100.000, margen 50 % | precio 200.000; utilidad 100.000 |

### Caracterización de la fórmula actual

Con 60 min de impresión, 100 g, 60 min de armado, filamento 80.000/kg, potencia 1.000 W, energía 1.000/kWh, mano de obra 20.000/h, desgaste 10 %, operativo 5 % y `profitPercent` 50 %:

```text
material = 8.000
energía = 1.000
mano de obra = 20.000
base = 29.000
desgaste = 2.900
operativo = 1.450
subtotal = 33.350
utilidad/markup = 16.675
precio final = 50.025
margen real = 33,333... %
```

Este test debe demostrar la semántica actual; no debe renombrarse como margen objetivo.

### Fallas

- 100 g planificados, falla al 40 %: 40 g perdidos y 60 g devueltos al stock.
- Verificar cada componente de costo perdido según la política que se confirme.
- Verificar que una falla al 0 % no consuma ni genere costo variable, salvo costos fijos por intento acordados.
- Definir y probar si 100 % es válido.
- Verificar que reportes, stock y consumo den el mismo resultado.

### Bordes e inválidos

- cero gramos con tiempo positivo;
- cero tiempo, con definición explícita de validez;
- cero tarifa/costo;
- porcentajes 0, 100 y fuera de rango;
- negativos, `NaN`, `Infinity`, strings vacíos y separadores locales;
- margen objetivo 100 % o mayor debe rechazarse;
- grandes importes COP sin pérdida visible;
- fracciones de COP internas y redondeo solo al final;
- suma de componentes igual al total mostrado/exportado;
- cantidad 1, cantidad >1 y cantidad 0 inválida;
- histórico ARS conserva importes y formatter ARS;
- registro COP usa COP y nunca mezcla agregados con ARS.

### Métricas

- producción OK sin venta: costo/stock sí, ingreso no;
- venta real: ingreso = precio cobrado × cantidad;
- utilidad = ingreso neto − costos asociados;
- margen ponderado agregado = utilidad total / ingreso total, no promedio simple de porcentajes;
- fallas por unidad y por intento con denominador definido;
- reportes mensuales respetan `America/Bogota` en límites de fecha.

## 17. Riesgos

1. **Reinterpretación de históricos:** cambiar el formatter a COP sin currency en cada registro haría que valores ARS parezcan COP.
2. **Recalcular al abrir/duplicar:** algunos flujos recalculan con parámetros actuales; una duplicación tras migrar podría cambiar moneda/modelo sin dejarlo claro.
3. **Datos solo locales:** borrar almacenamiento, cambiar navegador o dispositivo puede perder toda la operación.
4. **Sin ventas reales:** usar reportes actuales para decisiones de caja puede sobreestimar ingresos y utilidad.
5. **Costos omitidos:** máquina, postproceso, empaque, comisiones y otros pueden hacer que se cotice por debajo del costo.
6. **Fórmulas duplicadas:** reactivar helpers antiguos puede producir resultados distintos.
7. **Precisión/redondeo:** UI, PDF y Excel pueden no reconciliar exactamente.
8. **Monolito UI:** modificar Dashboard tiene alto riesgo de regresión.
9. **Sin tests:** no existe red de seguridad matemática.
10. **Calidad de build:** typecheck/lint fallan aunque Vite construya.
11. **Dependencias vulnerables:** 28 hallazgos de `npm audit`, incluido uno crítico.
12. **Zona horaria del navegador:** sin `America/Bogota`, cierres mensuales pueden variar según el dispositivo.

## 18. Decisiones que se necesitan confirmar

1. **Históricos:** ¿se etiquetan todos los registros v1 como ARS y se mantienen visibles, o se exportan/archivan y la operación COP inicia limpia?
2. **Pricing:** ¿se conserva markup como modo predeterminado, se cambia a margen objetivo, o se ofrecen ambos con selector explícito? Recomendación: ambos, mostrando siempre el margen resultante.
3. **Precio real:** ¿se creará una entidad venta separada y se registrará el precio efectivamente cobrado? Recomendación: sí.
4. **Máquina/hora:** ¿tarifa manual por máquina en v1 o cálculo automático desde compra/vida útil/mantenimiento? Recomendación: tarifa manual primero, calculadora auxiliar después.
5. **Mano de obra:** ¿una tarifa general o tarifas por tarea/persona? Recomendación: lista de tareas con minutos y tarifa snapshot.
6. **Postprocesado:** ¿retiro de soportes, lijado, pegado, pintura, acabado y empaque se registran como tiempo, costo plano o ambos? Recomendación: ambos por line item.
7. **Desperdicio y riesgo:** ¿qué conceptos son material adicional determinístico y cuáles contingencia esperada por fallas? Deben separarse para evitar doble conteo.
8. **Indirectos:** ¿porcentaje sobre qué base, costo fijo mensual asignado por horas/unidades/ingresos o combinación? Recomendación: pool mensual asignado con criterio explícito, no porcentaje ambiguo.
9. **Materiales:** ¿se manejarán compras/lotes completos para FDM y resina, o solo costo unitario manual? Recomendación: compra + cantidad + costo unitario derivado.
10. **Cantidad/lotes:** confirmar si una cotización representa una unidad o un lote y cómo se descuentan gramos.
11. **Fallas:** confirmar qué costos se pierden según porcentaje impreso y cuáles ocurren completos por intento.
12. **Redondeo COP:** confirmar si el precio final se redondea al peso, a centenas o a miles; los cálculos internos no deben redondearse temprano.
13. **Impuestos:** definir si los precios se manejan antes/después de impuestos y si la configuración será opcional. No se debe asumir una obligación tributaria.
14. **Comisiones/descuentos/envío:** confirmar si afectan precio al cliente, ingreso neto, costo o combinaciones separadas.
15. **Persistencia:** ¿continuar local-first con export/backups o sincronizar datos operativos en Supabase? Para uso real multi-dispositivo se recomienda backend con historial auditable.
16. **Lenguaje:** ¿español colombiano neutral (“puedes”, “ingresa”) en toda la app y wiki? Recomendación: sí.
17. **Valores COP iniciales:** proporcionar valores reales de filamento/resina, kWh, mano de obra y máquinas. No deben inferirse ni convertirse desde ARS.

## Dictamen de la fase 1

La migración no debe comenzar con un reemplazo global ARS → COP. Primero debe cerrarse el contrato económico, preservar/etiquetar los datos v1 y cubrir el motor con tests. La secuencia segura es: **backup → tests → configuración regional → migración versionada → modelo de costo real → ventas/métricas → UX Colombia**.

Esta auditoría se detiene aquí. No se implementó la migración financiera.
