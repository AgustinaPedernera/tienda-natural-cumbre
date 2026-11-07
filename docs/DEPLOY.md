# Publicar y comprobar en Vercel

La configuración del repositorio está preparada. Esta guía no acredita un despliegue realizado. No pegar claves privadas en GitHub, en el README ni en el chat.

## 1. Proyecto

En Vercel, abrir el proyecto ya vinculado a este repositorio, si existe. En caso contrario, importar `AgustinaPedernera/tienda-natural-cumbre` desde GitHub. La raíz es la carpeta que contiene `package.json`; framework Vite y Node.js 24.x. El repositorio define instalación `npm ci`, build `npm run build` y salida `dist`.

Usar `main` como rama de producción después de revisar e integrar el pull request. Los cambios de la rama de trabajo pueden probarse como Preview antes de integrarlos. No publicar la versión antigua de `main` por error.

## 2. Variables

En Settings → Environment Variables copiar los valores propios que funcionan localmente y asignarlos a los entornos que se van a probar: Preview y Production. Se requieren las 14 variables de `.env.example`.

- Las seis `VITE_FIREBASE_*` son la configuración web del mismo proyecto Firebase.
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY` son privadas. La clave debe conservar sus delimitadores y sus saltos de línea; también se admite `\n`.
- `S3_REGION`: región del bucket; en el entorno utilizado durante el desarrollo, `sa-east-1`.
- `AWS_S3_BUCKET`: nombre del bucket privado.
- `S3_ACCESS_KEY_ID` y `S3_SECRET_ACCESS_KEY`: credenciales IAM de carga/verificación de objetos. Usar estos nombres en Vercel; los antiguos nombres `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y `AWS_REGION` se admiten únicamente por compatibilidad con el archivo local.
- `AWS_CLOUDFRONT_URL`: URL HTTPS de la distribución, por ejemplo `https://DISTRIBUCION.cloudfront.net`.

Ninguna credencial privada debe llevar prefijo `VITE_`. Cambiar variables del frontend requiere desplegar nuevamente. `firebase-admin` es una dependencia de producción; el helper privado está en `server/`, fuera de la carpeta de endpoints `api/`.

## 3. Dominios y servicios

Agregar el dominio real de la tienda a los dominios autorizados de Firebase Authentication. Si se prueba Google en un dominio Preview, autorizar también ese dominio concreto.

En CORS de S3 conservar los orígenes locales necesarios y agregar el origen HTTPS exacto de la tienda. Habilitar `POST` para los formularios firmados; permitir los encabezados necesarios. No hacer público el bucket para resolver un error de carga. CloudFront debe mantener acceso de lectura al bucket mediante su configuración de origen.

Revisar y publicar `firestore.rules` en la consola de Firebase. Las escrituras del cliente están bloqueadas; las funciones utilizan Firebase Admin y son responsables de validar permisos y datos. Las reglas no se publican automáticamente desde este repositorio.

## 4. Prueba de aceptación

Con una cuenta cliente y otra administradora, usando productos de prueba:

- Abrir `/`, `/products/ID_REAL`, `/cart`, `/orders` y `/admin/products` directamente y recargar. Las rutas de React deben cargar; `/api/*` debe seguir resolviendo funciones y los archivos estáticos deben conservar sus rutas.
- Crear cuenta, ingresar con correo y Google, cerrar sesión y comprobar los permisos de cada rol.
- Buscar, filtrar, cambiar de página y abrir un producto. Revisar imágenes y fallback.
- Comprar una unidad; comprobar orden, total de servidor y descuento de stock. Reintentar la misma solicitud de prueba no debe crear otra orden.
- Verificar que el cliente vea solo sus órdenes y que no pueda modificar productos ni estados.
- Cambiar estados como administrador y cancelar una orden de prueba; comprobar que el stock se reponga una sola vez.
- Crear un producto con imagen JPG/PNG/WebP menor a 5 MiB y comprobar su URL CloudFront. Probar editar y eliminar un producto que no pertenezca a una orden abierta.
- Revisar temas y tamaños 360, 768 y 1366 px, navegación por teclado y ausencia de errores en Console/Network.

Las pruebas de frontend con mocks y `npm run preview` no validan estas integraciones del despliegue. Usar la URL de Vercel para la aceptación completa.

## 5. Cierre de entrega

Agregar al README la URL pública comprobada, conservar la URL del repositorio y registrar fecha y resultado de la prueba de aceptación. Revisar que GitHub Actions esté verde y que ningún secreto haya sido incluido en los cambios.

Pendientes conocidos: pago simulado, sin logística de entrega, carrito en memoria, paginación en cliente, imágenes huérfanas sin limpieza automática y advertencia de tamaño del bundle principal. No subir el límite de Vite para ocultar esa advertencia. Evitar `npm audit fix --force`: revisar las actualizaciones y sus cambios incompatibles por separado.
