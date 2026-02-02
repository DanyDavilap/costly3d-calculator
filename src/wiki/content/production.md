# Producción

Producción es el historial operativo de la app. Todo lo que se imprime debe quedar registrado como OK o fallido. Esto permite analizar rentabilidad real y repetir impresiones con datos consistentes.

## Estados de producción

- En producción: impresión en curso, aún sin resultado.
- Finalizada OK: impresión completa, genera ingresos.
- Finalizada fallida: impresión incompleta, genera pérdidas.

## Qué se registra

- Material consumido
- Costos asociados
- Estado final
- Fecha de inicio y finalización

## Por qué no se elimina

Eliminar registros rompe la trazabilidad. Sin historial real no hay análisis confiable. Por eso Costly3D mantiene todas las impresiones en Producción.

## Reimpresión

Si una impresión falló, podés duplicarla para reintentar. La reimpresión crea un nuevo registro en Producción y conserva la referencia al original.

## Buenas prácticas

- Marcá OK solo si la pieza está entregable.
- Marcá fallida en cuanto se detecte el error.
- Registrá fallas para mejorar procesos y reducir pérdidas.
