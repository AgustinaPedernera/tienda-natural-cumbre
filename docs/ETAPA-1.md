# Etapa 1: configuración y diagnóstico

## Ejecutar en tu computadora

1. Instalá las dependencias con `npm ci` (Node 24 usado en la verificación).
2. Copiá `.env.example` a `.env.local`.
3. En Firebase Console → Configuración del proyecto → Tus apps → aplicación web, copiá cada campo a la variable `VITE_FIREBASE_*` correspondiente. Todos deben pertenecer a la misma aplicación.
4. Habilitá Email/Password y Google en Authentication → Sign-in method. Revisá `localhost` en dominios autorizados.
5. Ejecutá `npm run dev` para el frontend. Para usar `/api/checkout`, ejecutá `npm run dev:full` con Vercel CLI y vinculá el proyecto cuando lo solicite. Usá el puerto que indique la terminal.
6. Para checkout, configurá también las variables de Firebase Admin del backend. La clave privada debe ser la de una cuenta de servicio autorizada; jamás uses el prefijo `VITE_` para estos datos.
7. Reiniciá el servidor después de cambiar variables. En Vercel hay que volver a desplegar después de configurarlas.

La validación nueva detecta valores ausentes o vacíos; no verifica que una API key sea válida ante Google. Si continúa `API_KEY_INVALID`, compará localmente el valor con la configuración web del proyecto. No lo pegues en chats ni en commits.

`localhost:3000` es una dirección local. Puede servir Vercel CLI, pero no constituye un deploy público.

## Cambios

- React y tipos ajustados a 18.
- `.env.example` agregado y excepción de `.gitignore` corregida.
- Inicio con aviso visual si falta configuración, antes de inicializar Firebase.
- Estados de carga, error y catálogo vacío visibles.
- Opción de quitar productos desaparecidos del carrito.
- Comando `dev:full` para Vercel CLI.

## Próximas etapas

1. Verificar autenticación con la configuración real y probar recuperación/errores de sesión.
2. Resolver roles confiables, reglas de Firestore y pruebas de acceso.
3. Catálogo: filtro, búsqueda con debounce y detalle.
4. Administración de productos e imágenes con presigned URLs S3.
5. Historial, detalle y administración de órdenes; refresco del stock después del checkout.
6. Tests de flujos completos, diseño mobile first con Tailwind y deploy.
7. Preparación comercial: acordar pago real, envíos, cancelaciones, comprobantes y políticas del comercio. Hoy el checkout solo registra una orden; no cobra.

No se verificaron Firebase, AWS ni Vercel con servicios reales porque no hay configuración de esas cuentas disponible en este entorno. Las reglas desplegadas de Firestore tampoco pueden inferirse del repositorio.

## Verificación realizada

- Build de producción: aprobado con React 18.
- Vitest: 7 tests aprobados en 4 archivos, sin servicios externos.
- Lint: finaliza sin errores; informa advertencias preexistentes de Fast Refresh y una variable sin uso.
- El build advierte un chunk superior a 500 kB; queda pendiente optimizar la carga de Firebase.
- No se realizó prueba en navegador ni checkout real contra Firestore.
