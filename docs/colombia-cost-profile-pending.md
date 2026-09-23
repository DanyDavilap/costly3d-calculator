# Perfil `Costly estándar`: referencias pendientes para Colombia

Esta primera versión mantiene centralizados los valores que ya existían en la calculadora anterior. Sirven para que una persona pueda completar una cotización rápida, pero **no son un estudio de mercado colombiano** y no deben publicarse como definitivos sin aprobación.

## Referencias activas por validar

| Concepto | Referencia actual | Origen | Validación necesaria |
|---|---:|---|---|
| PLA estándar | 30.000 COP/kg | Única tarifa global de material de la calculadora anterior | Precio representativo por proveedor, marca, calidad e IVA |
| PETG estándar | 30.000 COP/kg | Fallback de la única tarifa global previa | Precio propio de PETG; no asumir que cuesta igual que PLA |
| TPU estándar | 30.000 COP/kg | Fallback de la única tarifa global previa | Precio propio de TPU; no asumir que cuesta igual que PLA |
| ABS estándar | 30.000 COP/kg | Fallback de la única tarifa global previa | Precio propio de ABS; no asumir que cuesta igual que PLA |
| Electricidad | 100 COP/kWh | Calculadora anterior | Tarifa residencial/comercial aplicable, ciudad, estrato y fecha |
| Potencia estándar | 80 W | Calculadora anterior | Consumo medio medido por familia de impresora y material |
| Mano de obra de impresión | 1.000 COP/h | Calculadora anterior | Política: supervisión activa versus tiempo autónomo |
| Lijado | 1.000 COP/h | Tarifa laboral global anterior | Tarifa interna real y tiempos típicos |
| Pintado a mano | 1.000 COP/h | Tarifa laboral global anterior | Tarifa interna real; la pintura como insumo se carga aparte |
| Otros acabados | 1.000 COP/h | Tarifa laboral global anterior | Tarifas por operación o una tarifa manual única |
| Desgaste/mantenimiento | 5% de costos directos | Porcentaje simple de desgaste anterior | Confirmar base del porcentaje y si se reemplaza por COP/h por máquina |
| Reserva por fallos/merma | 5% del costo previo a reserva | Porcentaje operativo anterior, ahora separado | Tasa histórica de fallos y base exacta de aplicación |
| Precio sugerido | Markup de 40% | Estrategia anterior | Markup objetivo por tipo de producto y redondeo comercial |

## Decisiones de cálculo implementadas

- Los gramos son el total reportado por el laminador; el perfil no añade otro porcentaje de material.
- Un material guardado con costo COP válido reemplaza la referencia estándar.
- Una tarifa personalizada de electricidad o mano de obra reemplaza el valor estándar.
- Una impresora con potencia o costo por hora definidos reemplaza esa parte del perfil sin bloquear la cotización.
- Cotizar no reserva ni descuenta inventario. `Enviar a producción` crea una orden asociada; el consumo ocurre al iniciar la orden.
