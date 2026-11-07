# Tienda Cumbre 🌿

E-commerce de productos naturales desarrollado con React 18, TypeScript, Vite y Tailwind CSS 4. Firebase administra las cuentas y los datos; las funciones de Vercel validan las compras, los permisos administrativos y las cargas de imágenes a Amazon S3.

Proyecto integrador del Módulo 5. **El checkout registra órdenes; el pago es simulado.** La URL pública está pendiente de configurar y verificar en Vercel.

## Funcionalidades

- Catálogo con búsqueda, categorías, paginación y detalle de producto.
- Carrito con cantidades, disponibilidad y confirmación de compra.
- Registro, ingreso con correo o Google y recuperación de contraseña.
- Historial de compras de cada cliente.
- Administración de productos e imágenes y gestión de estados de las órdenes.
- Tema claro y oscuro, identidad Cumbre, favicon y diseño desde móvil.

## Ejecutar localmente

Usar **Node.js 24 LTS** y npm. Desde la carpeta que contiene `package.json`:

```powershell
npm ci
Copy-Item .env.example .env.local
```

Completar `.env.local` con la configuración de Firebase y AWS. No subir este archivo ni las claves privadas. Luego:

```powershell
npm run dev:local
```

Este comando inicia `vercel dev` con las variables locales. Puede solicitar iniciar sesión y vincular el proyecto de Vercel la primera vez. Usar la dirección que imprime la terminal.

`npm run dev` y `npm run preview` sirven la interfaz, pero **no ejecutan las funciones de `api/`**. Para comprar o cargar imágenes localmente se necesita `dev:local`.

| Variables | Uso |
| --- | --- |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` | Configuración pública del mismo proyecto Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Resto de la configuración de la aplicación web Firebase |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Credenciales privadas de Firebase Admin, solo servidor |
| `S3_REGION`, `AWS_S3_BUCKET` | Región y bucket de imágenes |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Credenciales IAM, solo servidor |
| `AWS_CLOUDFRONT_URL` | URL HTTPS de distribución de las imágenes |

La clave privada admite saltos de línea o `\n`. Las credenciales del servidor nunca llevan el prefijo `VITE_`. El helper admite los antiguos nombres `AWS_REGION`, `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` desde `.env.local`; para nuevas configuraciones y Vercel usar los nombres `S3_*` de la tabla.

## Servicios externos

En Firebase habilitar Email/Password y Google en Authentication, registrar los dominios autorizados y crear Firestore. El archivo [`firestore.rules`](firestore.rules) contiene las reglas propuestas: lectura pública de productos, lectura de órdenes por su dueño o por un administrador, y escrituras exclusivamente mediante el servidor. Revisar y publicar estas reglas en Firebase; guardarlas en Git no las aplica automáticamente.

Una cuenta nueva es cliente. Para otorgar el rol administrador a una cuenta existente, obtener su UID desde Firebase Authentication y ejecutar con credenciales de un administrador del proyecto:

```powershell
node --env-file=.env.local scripts/setAdmin.mjs UID_DE_LA_CUENTA
```

Después cerrar sesión y volver a ingresar. Ocultar una pantalla en React no concede ni reemplaza permisos: los endpoints verifican el token y el rol.

En S3 configurar un bucket privado y CORS para los orígenes de la tienda, método `POST`. Dar al usuario IAM permisos limitados a los objetos `products/*` necesarios para subir y verificar imágenes. CloudFront debe tener acceso de lectura al bucket privado; las imágenes de productos se distribuyen públicamente por CloudFront.

## Arquitectura

```text
src/
  components/       tarjetas, grilla, navegación y paginación
  contexts/         autenticación, catálogo y carrito
  reducers/         transiciones del carrito
  hooks/            acceso tipado a los contexts
  pages/            catálogo, detalle, cuenta, compras y administración
  services/         Firestore y llamadas HTTP
  tests/            pruebas de hooks, integración y endpoints
api/                checkout, manageProduct, updateOrderStatus, createImageUpload
server/             inicialización privada de Firebase Admin
scripts/            asignación del rol administrador
```

Context comparte la sesión y el catálogo; `useReducer` mantiene explícitas las operaciones del carrito. Los providers se componen como `AuthProvider → ProductsProvider → CartProvider`. El carrito se vacía al salir o cambiar de cuenta y conserva sus artículos durante una renovación de token de la misma cuenta. Se guarda en memoria: recargar la página lo reinicia.

Las páginas se cargan con `React.lazy` y `Suspense`. Se conserva la agrupación automática de Vite: una separación manual de Firebase produjo un error de inicialización en el navegador y se retiró. Actualmente permanece la advertencia del bundle principal de aproximadamente 754 kB sin comprimir; el build termina correctamente. Reducir ese tamaño es una mejora pendiente, que requiere verificar el comportamiento en el navegador.

### Compra y datos

`products` contiene nombre, categoría, precio entero en pesos, stock y, opcionalmente, URL/clave de imagen y versión administrativa. El carrito guarda referencias `{ productId, quantity }`.

`POST /api/checkout` valida el token y las cantidades, vuelve a leer precios y stock desde Firestore y crea la orden junto con el descuento de stock en una transacción. `requestId` y la huella del carrito permiten reintentar una solicitud sin descontar dos veces. Las órdenes guardan una copia de los artículos, precios, cantidades, total, usuario y estado; cambios posteriores del catálogo no alteran esa compra.

Los estados administrativos incluyen pendiente, en preparación, completada y cancelada. La cancelación repone stock en una transacción y evita reponerlo dos veces. Las operaciones de productos validan permisos y conflictos de versión; no se permite borrar productos referenciados por órdenes abiertas.

### Imágenes

El administrador solicita un formulario firmado a `/api/createImageUpload` y el navegador envía el archivo directamente a S3. Se aceptan JPG, PNG y WebP de hasta 5 MiB; la autorización de carga vence en 60 segundos. El servidor elige el nombre y, antes de guardar el producto, comprueba metadatos y bytes iniciales del objeto. Esto no equivale a un análisis antivirus ni a decodificar la imagen completa. La limpieza de imágenes huérfanas queda pendiente.

## Validación

```powershell
npm run test:run
npm run build
# Ambos en secuencia:
npm run check
```

La revisión de cierre ejecutó **76 pruebas en 7 archivos**, todas aprobadas, y compiló frontend y funciones TypeScript. Las pruebas utilizan mocks de Firebase y AWS; no sustituyen pruebas contra servicios reales ni acreditan un despliegue público. La integración continua ejecuta `npm run check` con Node 24.

| Archivo de pruebas | Casos |
| --- | ---: |
| `cartReducer.test.ts` | 13 |
| `useCart.test.tsx` | 4 |
| `CartIntegration.test.tsx` | 4 |
| `useAuth.test.tsx` | 15 |
| `CheckoutFlow.test.tsx` | 5 |
| `checkoutApi.test.ts` | 18 |
| `createImageUpload.test.ts` | 17 |

El mensaje esperado de `useCart` fuera de su provider corresponde a una prueba del guard, cuando aparece en la salida de React/jsdom. El resumen final de Vitest determina si el test pasó.

## Entrega y próximos pasos

Consultar la [guía de Vercel y comprobación final](docs/DEPLOY.md) y el [guion de demostración](docs/DEFENSA.md). Falta configurar los secretos en Vercel, probar la aplicación desplegada y agregar aquí su URL real. La paginación actual funciona sobre el catálogo descargado completo; para catálogos grandes conviene consultar Firestore por páginas. No hay cobros reales ni gestión de entregas.

## Bitácora de uso de IA

ChatGPT acompañó la implementación y revisión; las decisiones se contrastaron con ejecuciones locales, capturas y resultados compartidos durante el trabajo. Las entradas siguientes resumen intercambios reales, no transcripciones literales.

| Consulta o problema observado | Orientación y decisión aplicada | Comprobación o aprendizaje |
| --- | --- | --- |
| Los flyers debían definir la identidad y la tienda debía ser mobile first | Usar crema, verdes y amarillo maíz para marca y sol; reducir tarjetas y tamaños móviles | Se revisaron capturas de catálogo, administración y distintos anchos |
| Algunas secciones conservaban estilos anteriores | Unificar superficies, controles y estados entre carrito, cuenta, detalle y administración | La autora comprobó las páginas y confirmó su funcionamiento |
| El nombre de usuario quedaba separado en tablet | Ajustar la distribución responsive de la cabecera | La autora comparó laptop y tablet y confirmó el resultado |
| Advertencias `min-w-[640px]` y `aspect-[4/3]` | Adoptar las formas canónicas de Tailwind cuando son equivalentes | Se distinguieron sugerencias del editor de errores de compilación |
| Hacía falta comprobar carrito y compra | Añadir pruebas del reducer, hooks, integración, checkout y carga de imágenes | La autora compartió 75 pruebas aprobadas antes del cierre |
| El build advertía un bundle grande | Cargar páginas por separado; ensayar agrupación de dependencias y retirar la separación que rompía Firebase | Un build exitoso no garantiza que el navegador arranque; se probó con preview |
| La renovación del token podía parecer una salida de sesión | Conservar la identidad durante la comprobación del token de la misma cuenta | Una prueba nueva falló antes de corregirlo y pasó después; total: 76 |
| Preparación para Vercel | Sacar el helper de `api`, declarar Firebase Admin en dependencias de servidor y comprobar TypeScript de las funciones | Build de cierre aprobado; verificación del despliegue todavía pendiente |

La documentación de las primeras homeworks, con sus decisiones y bitácora originales, se conserva en [Historial de homeworks](docs/HISTORIAL-HOMEWORKS.md). Describe etapas anteriores y no el estado actual del producto.
