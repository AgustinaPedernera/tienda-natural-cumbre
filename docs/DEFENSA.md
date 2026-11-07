# Guion breve de demostración

1. Presentar Cumbre, su identidad basada en los flyers y el objetivo del catálogo. Aclarar que el pago es simulado.
2. Mostrar catálogo, búsqueda, categoría y paginación; cambiar el ancho a móvil/tablet y alternar tema.
3. Abrir un producto, agregarlo al carrito y explicar que precio y stock se vuelven a verificar en el servidor.
4. Ingresar como cliente, confirmar una compra de prueba y encontrarla en Mis compras. Explicar la copia de precios en la orden y el identificador de reintento.
5. Ingresar como administrador, crear/editar un producto con imagen y gestionar una orden. Mostrar la reposición de stock al cancelar.
6. Recorrer el código: providers y reducer, servicios, funciones, helper privado y reglas. Los permisos reales dependen del token y del servidor.
7. Ejecutar `npm run check`: 76 casos con mocks y compilación de frontend y funciones. Explicar que los servicios reales requieren la aceptación del despliegue.
8. Mostrar la bitácora de IA: decisiones aceptadas, sugerencias corregidas y evidencia. Ejemplos: separación manual de Firebase retirada tras un fallo en preview y regresión del carrito durante renovación de token cubierta por una prueba.

Antes de exponer, preparar cuentas y un producto de prueba sin datos personales. No abrir archivos de credenciales ni paneles que muestren claves durante la demostración. Evitar modificar stock real para una demo.

La URL pública y la prueba en Vercel deben completarse antes de presentar el proyecto como publicado. La guía de despliegue contiene la lista de aceptación y los límites actuales.
