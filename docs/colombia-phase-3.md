# Costly3D — Fase 3 de la migración a Colombia

Fecha de cierre: 19 de septiembre de 2026.

## Alcance y resultado

La Fase 3 convierte la infraestructura financiera V2 en un flujo operativo para cotizar y registrar ventas internas en Colombia. La aplicación permite cargar los valores reales del negocio en COP, advierte cuando faltan datos y conserva el detalle usado en cada cotización.

No se convirtieron importes ARS, no se cargaron tarifas colombianas de ejemplo como valores productivos y no se implementaron impuestos, DIAN, facturación electrónica, contabilidad completa ni una migración a Supabase.

## 1. Máquinas

Se añadió el dominio y la persistencia local de máquinas. La instalación inicial crea una única identidad:

- nombre: `Bambu Lab P2S`;
- marca: `Bambu Lab`;
- modelo: `P2S`;
- moneda: `COP`;
- estado: activa.

Precio de compra, potencia, tarifa por hora y reserva de mantenimiento quedan sin valor hasta que el usuario los ingrese. Un valor explícito de `0 COP/h` se distingue de un campo sin configurar.

Configuración permite editar esos campos, activar o desactivar cada máquina y agregar más impresoras. El CTA `Calcular tarifa · Próximamente` queda desactivado para preparar una futura calculadora sin introducir supuestos de depreciación, vida útil o mantenimiento.

Las máquinas se guardan en `machinesV2`. Cada cotización V2 conserva la identidad, potencia y tarifa de la máquina en su snapshot financiero, por lo que los cambios posteriores no reescriben el historial.

## 2. Materiales

El formulario de materiales ahora registra:

- nombre visible, marca, tipo y color;
- tecnología (`FDM`, `SLA`, `SLS` u otra);
- cantidad inicial y restante;
- unidad (`g`, `kg`, `ml` o `l`);
- precio de compra COP;
- costo por kg manual alternativo;
- fecha de compra opcional;
- estado activo/inactivo.

Para materiales en gramos o kilogramos, si existen precio de compra y cantidad inicial, se deriva el costo por unidad base, por gramo y por kilogramo. La tabla muestra costo/kg y costo/g o `Sin precio COP`.

El cotizador toma el costo exclusivamente del spool COP seleccionado. Un costo legacy ARS nunca se reutiliza como COP. El snapshot guarda identidad, compra, costo/kg, costo/g, gramos netos, desperdicio, gramos facturables y costos resultantes. Modificar el spool después no altera una cotización guardada.

## 3. Configuración económica

Se añadió `BusinessEconomicSettings`, persistido en `businessEconomicSettingsV2`, con:

- tarifa de electricidad COP/kWh, vigencia opcional y notas/fuente;
- tarifa base de mano de obra COP/h, vigencia opcional y notas/fuente;
- estrategia `markup` o `target_margin`;
- porcentaje predeterminado opcional;
- redondeo comercial.

Electricidad, mano de obra, estrategia y porcentaje comienzan sin configurar. No existe un porcentaje productivo inventado. El redondeo se mantiene en `exact` como comportamiento estructural neutro hasta que el usuario elija otra opción.

La dirección de redondeo respeta el motor de Fase 2: se usa el múltiplo más cercano con `Math.round`. Las opciones visibles son exacto, 100, 500 y 1.000 COP. Se muestran por separado precio matemático y precio comercial.

## 4. Estado de configuración

`BusinessSetupStatus` revisa:

1. moneda COP;
2. máquina activa;
3. tarifa de máquina;
4. potencia de máquina;
5. material activo con precio COP;
6. tarifa de electricidad;
7. tarifa de mano de obra;
8. estrategia y porcentaje de pricing.

Dashboard y Configuración muestran cuántos puntos están listos. El estado no bloquea la aplicación: una cotización puede calcularse con datos pendientes, pero queda marcada como parcial y explica cada omisión.

`undefined` significa `Sin configurar`; un cero explícito y finito significa que el usuario sí confirmó ese valor. Esta distinción evita presentar ceros internos de compatibilidad como tarifas validadas.

## 5. Cotizador V2

La pantalla principal expone primero los datos esenciales: producto, categoría, tiempos, peso neto, material, cantidad del lote y máquina. Debajo se encuentran costos, estrategia, tareas y adicionales.

Las tareas disponibles son retiro de soportes, lijado, pegado, ensamblaje, pintura, acabado, empaque y otro. Cada tarea acepta minutos y tarifa propia opcional. Si la tarifa particular está vacía, el adaptador usa la tarifa laboral base; si tampoco existe, el costo queda pendiente y la cotización se marca como parcial. La UI muestra el costo resultante de cada tarea.

Los adicionales aceptan nombre, cantidad y costo unitario, muestran su subtotal y se suman al costo de producción.

El resultado presenta por unidad:

- material neto y desperdicio;
- electricidad y consumo kWh;
- uso de máquina;
- mano de obra;
- adicionales;
- costo de producción estimado;
- precio matemático y comercial;
- utilidad, markup y margen resultante.

Los datos vacíos se adaptan a cero únicamente para permitir que el núcleo matemático calcule; la confiabilidad conserva cuáles valores faltaban y la interfaz nunca los presenta como configuración confirmada.

## 6. Cotizaciones parciales y completas

Cada registro guarda `reliabilitySnapshot` con fecha, nivel, códigos faltantes y mensajes.

- `Completa`: todos los parámetros principales de esa cotización están confirmados.
- `Parcial`: falta al menos un parámetro. El resultado muestra advertencias específicas, por ejemplo tarifa de máquina, potencia, material, electricidad, mano de obra o pricing pendientes.

El snapshot evita que completar la configuración mañana haga parecer completa una cotización histórica que se calculó con información incompleta.

## 7. Unidad y lote

Todos los campos de consumo y tiempo del formulario representan una unidad. La cantidad debe ser un entero mayor que cero.

El cálculo conserva dos niveles separados:

- unidad: componentes de costo, precio y utilidad de una pieza;
- lote: cada componente unitario multiplicado por la cantidad.

El resumen muestra costo, precio y utilidad del lote cuando la cantidad es mayor que uno. El historial etiqueta la cantidad y muestra importes de lote. El material reservado/descontado para producción usa gramos facturables por unidad multiplicados por la cantidad.

## 8. Venta simple

Una producción `finalizada_ok` en COP ofrece la acción `Venta`. El formulario solicita:

- cantidad vendida;
- precio unitario realmente cobrado;
- fecha;
- descuento opcional;
- comisión opcional;
- costo de envío asumido opcional.

El registro calcula ingreso bruto, ingreso neto, costo de producción asociado, utilidad real y margen real. No permite vender más unidades que las disponibles en esa producción. No calcula IVA ni otro impuesto; `taxes` permanece en cero como decisión explícita de alcance.

Las ventas se versionan con `schemaVersion: 1`, `calculationModelVersion: "sale-v1"`, COP y timestamps, y se persisten en `salesV1`. El respaldo financiero incluye esta clave junto con máquinas y configuración económica.

## 9. Métricas estimadas frente a reales

Los reportes separan dos mundos:

- estimado: precio sugerido, costos y utilidad derivados de cotizaciones/producciones;
- real: cantidad de ventas, unidades vendidas, ingreso neto, costo asociado, utilidad y margen provenientes únicamente de `Sale`.

Finalizar una producción no genera una venta ni un ingreso. Sin ventas registradas, los ingresos reales son `0 COP`. Las tarjetas del reporte etiquetan por separado rentabilidad estimada, ingresos reales y utilidad real.

Las fechas `AAAA-MM-DD` del formulario de venta se interpretan explícitamente para que la venta se agregue al mes y año correctos.

## 10. Legacy ARS

- Los registros anteriores mantienen metadata y presentación ARS.
- No existe conversión ARS → COP.
- Un spool ARS no aporta costo a una cotización COP.
- Los históricos ARS se excluyen de agregaciones de producción COP.
- Las ventas y métricas reales filtran por moneda COP.
- Los tests verifican que COP y ARS no se agreguen juntos.

## 11. Tests

Se añadieron pruebas para:

- Bambu Lab P2S sin importes ni potencia inventados;
- máquina sin tarifa y con tarifa explícita;
- material sin precio y con precio;
- derivación de costo por gramo/kg;
- cotización parcial y completa;
- snapshot de spool inmutable ante cambios del precio fuente;
- cantidad mayor que uno y separación unidad/lote;
- line items adicionales;
- fallback de una tarea a la tarifa laboral base;
- venta con ingreso, costo, utilidad y margen real;
- producción terminada con cero ingresos reales;
- venta separada de producción;
- exclusión ARS de métricas COP y no agregación de monedas;
- redondeo comercial y fórmulas financieras, conservando las pruebas de Fase 2.

Resultado final: 10 archivos de prueba y 51 pruebas aprobadas.

## 12. Archivos modificados

Archivos nuevos de esta fase:

- `src/domain/businessSetup.ts`
- `src/persistence/businessSetupPersistence.ts`
- `src/core/quoteCalculatorV2.ts`
- `src/core/sales.ts`
- `src/persistence/salesPersistence.ts`
- `src/domain/businessSetup.test.ts`
- `src/core/quoteCalculatorV2.test.ts`
- `src/core/sales.test.ts`
- `docs/colombia-phase-3.md`

Archivos extendidos:

- `src/pages/Dashboard/Dashboard.tsx`
- `src/core/financialEngineV2.ts`
- `src/domain/sales.ts`
- `src/core/salesMetrics.ts`
- `src/utils/monthlyMetrics.ts`
- `src/utils/v2PricingAdapter.ts`
- `src/persistence/financialBackup.ts`
- `src/core/salesMetrics.test.ts`
- `src/utils/v2PricingAdapter.test.ts`

Los cambios de Fase 2 siguen sin commit en el mismo árbol de trabajo y se preservaron.

## 13. Verificación final

### `npm run build`

Pasa. Vite genera `dist`. Permanecen advertencias no bloqueantes por `caniuse-lite` desactualizado y un chunk principal mayor de 500 kB.

### `npm test`

Pasa: 10 archivos y 51 pruebas.

### `npm run typecheck`

Continúa fallando con los mismos 11 errores legacy documentados en Fase 2: props de `WikiLayout` en Dashboard, una variable sin uso en Login y estrechamiento a `never` en `betaAccess.ts` y `waitlist.ts`. No quedan errores de tipos introducidos por los módulos de Fase 3.

### `npm run lint`

Continúa fallando con 35 errores y 13 advertencias legacy, la misma cuenta al cierre de Fase 2. Se mantienen principalmente variables de `catch` sin uso, `any`, escapes anteriores, hooks y fast refresh. No se hizo una limpieza global porque está fuera del alcance.

## 14. Descripción de la nueva UX

1. En Configuración aparece un panel de progreso y tarjetas editables de máquinas; Bambu Lab P2S se ve activa con tarifa, potencia, compra y mantenimiento pendientes.
2. Debajo aparecen Electricidad y Mano de obra con tarifa, vigencia y notas, seguidas por la estrategia comercial.
3. En Materiales, el formulario captura compra y cantidades, y la tabla informa costo por kg/g o estado pendiente.
4. El cotizador muestra máquina, material, lote y parámetros principales arriba; tareas y adicionales se añaden en bloques compactos.
5. El resultado empieza con una insignia `Completa` o `Parcial`, explica faltantes y separa valores unitarios del resumen del lote.
6. En Producción, una impresión terminada muestra la acción `Venta`; el modal calcula el efecto económico real antes de guardar.
7. Reportes muestra rentabilidad estimada, ingresos reales y utilidad real en tarjetas separadas.

## 15. Datos reales que debe ingresar el usuario

Para convertir las cotizaciones parciales en completas se necesitan:

1. potencia operativa de la Bambu Lab P2S en W;
2. tarifa de uso de máquina en COP/h;
3. opcionalmente precio de compra y reserva de mantenimiento;
4. cada spool real: cantidad inicial, restante, precio y fecha de compra;
5. tarifa real de electricidad en COP/kWh, vigencia y fuente;
6. tarifa base de mano de obra en COP/h;
7. estrategia comercial: markup o margen objetivo;
8. porcentaje comercial predeterminado;
9. preferencia de redondeo;
10. en cada venta, precio realmente cobrado y deducciones reales.

## 16. Decisiones pendientes

- Fórmula futura para sugerir tarifa de máquina, con vida útil, horas productivas, mantenimiento y repuestos definidos por el negocio.
- Captura de consumo eléctrico medido y costo real de producción frente al estimado.
- Estados de pago y ventas parciales más avanzados.
- Restauración validada del respaldo, además de la descarga actual.
- Tratamiento tributario colombiano, únicamente cuando se defina explícitamente.
- Plan separado para dependencias vulnerables, deuda de typecheck/lint y refactor gradual del Dashboard.

La Fase 3 se detiene aquí.
