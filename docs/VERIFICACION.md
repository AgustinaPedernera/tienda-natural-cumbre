# Registro de verificación de entrega

Cierre documentado el 8 de noviembre de 2026. Fuentes: resultados de terminal, GitHub Actions y pruebas/capturas compartidas por la autora. No se ejecutaron pruebas con sus credenciales desde el entorno del asistente.

**URL de entrega:** https://tienda-natural-cumbre.vercel.app  
**Código corregido validado:** commit `95cb2ba`, rama `feat/tienda-cumbre`.  
**Preview usada en las capturas de aceptación:** `tienda-natural-cumbre-hfn63q5ou-agus-b7d4.vercel.app`. Esa URL es evidencia de prueba, no el enlace para uso habitual.

## Comprobaciones automatizadas

- 76 pruebas de Vitest aprobadas en 7 archivos.
- Build de producción y comprobación TypeScript de frontend y funciones aprobados.
- Prueba adicional sin mocks del arranque de Firebase Admin y conversión de clave RSA con require(ESM) deshabilitado.
- Las dos ejecuciones de CI consultadas para `95cb2ba` finalizaron correctamente.
- Permanece la advertencia de tamaño del bundle principal (~754 kB sin comprimir).
- La última ejecución local de lint registrada terminó con cinco advertencias; no se presenta como una ejecución sin advertencias.
- Los tests de servicios usan mocks; no acreditan por sí solos integraciones reales.

## Pruebas manuales realizadas

| Flujo | Resultado y alcance de la evidencia |
| --- | --- |
| Ingreso con Google | La autora ingresó después de autorizar el dominio; capturas y confirmación durante la sesión |
| Persistencia de sesión | Se observó sesión activa al navegar y recargar; no constituye una prueba de todas las políticas de persistencia |
| Checkout | Captura de pedido registrado por $15.600, estado Pendiente y carrito vacío en Preview |
| Detalle de orden | Captura con producto, cantidad, importe y estado, leída desde la ruta de la orden |
| Administración de órdenes | La autora vio el pedido y lo completó desde su cuenta administradora |
| Stock | Tras completar la orden, la autora repuso manualmente el stock desde el producto; no fue una reposición automática por completar |
| Crear producto e imagen S3 | La primera carga falló por CORS; tras autorizar el origen, la autora creó el producto de prueba y el catálogo pasó de 60 a 61 |
| Editar producto | Captura del mensaje “Producto actualizado correctamente” y confirmación de la prueba |
| Eliminar producto | Confirmación de la autora tras la secuencia de edición y eliminación del producto de prueba |
| Dominio principal | La autora informó que actualizó Production y realizó compras y CRUD. Las capturas detalladas de aceptación conservadas en el chat corresponden a Preview |

Las capturas compartidas contienen cuentas y datos de pedidos, por lo que no se incorporan automáticamente al repositorio. Si se incluyen para una exposición pública, ocultar datos personales y no mostrar credenciales.

## Escenarios sin evidencia manual específica registrada

No se marcan como fallos ni se dan por verificados por inferencia: registro de una cuenta nueva con correo, recuperación de contraseña, intento directo de acceso administrativo con rol cliente, lectura de una orden ajena, cancelación con reposición única, todos los estados de validación y navegación completa por teclado. Algunos tienen cobertura de código o tests; ampliar la evidencia manual cuando se requiera certificar cada escenario.

## Incidentes resueltos y aprendizaje

1. `ERR_REQUIRE_ESM`: la función no arrancaba por jwks-rsa/jose. Se fijó una dependencia compatible de forma acotada y se incorporó una prueba de runtime real.
2. `config/invalid-private-key-format`: se corrigió el valor de Firebase Admin y se reconstruyó el entorno correspondiente.
3. Dominio no autorizado para Google: se agregó el host exacto. Cada URL de Preview es un origen diferente.
4. CORS S3: se añadieron los orígenes exactos para POST sin abrir el bucket.
5. Repetición de un deploy antiguo: se identificó por Source/commit y se reconstruyó el commit corregido.

## Estado del repositorio al cierre documental

El PR #2 estaba abierto como borrador al iniciar esta actualización. Publicar desde una rama no integra automáticamente esa rama a main. Verificar CI del último commit y revisar el PR antes de integrarlo. No compartir claves ni cuentas administrativas para evaluar la entrega; acordar un acceso de evaluación por un canal adecuado si se solicita.
