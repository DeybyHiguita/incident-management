# Día 18 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **interceptores HTTP y manejo global de errores.**

## 1. Conceptos del día

### Interceptores funcionales

Un interceptor se sitúa entre `HttpClient` y la red: ve pasar todas las
peticiones y todas las respuestas. En Angular moderno es una **función**,
no una clase:

```ts
export const correlationIdInterceptor: HttpInterceptorFn = (request, next) => {
  const withId = request.clone({ setHeaders: { 'X-Correlation-Id': newId() } });
  return next(withId);
};
```

Dos detalles importantes:

- **Las peticiones son inmutables.** No se modifican, se **clonan** con el
  cambio aplicado. Es la misma regla que la colección del Día 9, aplicada
  aquí por diseño del propio `HttpClient`.
- **Se ejecutan en contexto de inyección**, así que pueden usar `inject()`
  como cualquier componente. Es lo que permite que el de carga acceda al
  `LoadingService`.

### El orden de la cadena

Los interceptores se aplican en el orden declarado. La petición los recorre
de arriba abajo y la respuesta vuelve en sentido contrario:

```
petición  →  correlationId → loading → errorHandling → fakeBackend
respuesta ←  correlationId ← loading ← errorHandling ← fakeBackend
```

El razonamiento de este orden:

| Interceptor | Por qué va ahí |
|---|---|
| `correlationId` | primero, para que la cabecera llegue a todos los demás y al servidor |
| `loading` | envuelve al resto, así cuenta también el tiempo que tarda en fallar |
| `errorHandling` | el más cercano al backend: recibe el fallo en crudo y lo traduce antes de que nadie más lo vea |
| `fakeBackend` | cierra la cadena; el día que exista la API real, se quita |

Poner `errorHandling` antes que `loading` sería un fallo sutil: el error se
transformaría antes de que `loading` viera la respuesta, y el contador
seguiría funcionando, pero se pierde la simetría de que el más externo mida
el tiempo total.

### Identificador de correlación

Cada petición viaja con un `X-Correlation-Id` único. No sirve para nada en
el navegador; sirve **cuando algo falla**: ese identificador aparece en los
registros del servidor, así que un usuario que reporta un error puede dar
ese código y soporte encuentra la petición exacta, en vez de rebuscar por
hora aproximada.

Por eso el error que produce el interceptor lo conserva:

```ts
export class AppHttpError extends Error {
  constructor(message: string, readonly status: number, readonly correlationId: string | null) { … }
}
```

### Manejo global de errores

Antes esta traducción vivía dentro de `IncidentApi`. Funcionaba, pero
significaba que **cada capa de acceso nueva tendría que repetirla** — y
acabarían divergiendo. Ahora está en un solo sitio y cubre toda la
aplicación:

| Código | Mensaje |
|---|---|
| 0 | No hay conexión con el servidor. Comprueba tu red. |
| 400 | Los datos enviados no son válidos. Revisa el formulario e inténtalo de nuevo. |
| 401 | Tu sesión ha caducado. Vuelve a iniciar sesión. |
| 403 | No tienes permisos para realizar esta acción. |
| 404 | El recurso solicitado no existe. |
| 500 | El servidor no pudo procesar la solicitud. Inténtalo más tarde. |
| otro | Error inesperado del servidor (código). |

Con una precedencia deliberada: **si el servidor explica el problema, gana
su mensaje**. El backend sabe más que el cliente sobre lo que ha fallado
—«Mantenimiento programado», «El correo ya está registrado»—, y una tabla
genérica no puede competir con eso.

La consecuencia para el resto del código es la que importa: a partir de la
frontera HTTP, **nadie vuelve a ver un `HttpErrorResponse` ni un código de
estado**. `IncidentService` solo guarda `error.message`, y ya viene en
español y listo para mostrar.

### Mecanismo global de carga

El contador de peticiones estaba dentro de `IncidentService` desde el Día
15. Ahora vive en `LoadingService` y lo alimenta un interceptor, así que
**ningún servicio tiene que acordarse** de marcar y desmarcar: basta con
hacer la petición.

```ts
export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  const loadingService = inject(LoadingService);
  loadingService.start();
  return next(request).pipe(finalize(() => loadingService.stop()));
};
```

El `finalize` es lo que hace que funcione en los tres finales posibles:
éxito, error y **cancelación**. La cancelación no es teórica aquí: la
búsqueda del Día 16 cancela peticiones constantemente con `switchMap`. Con
un `tap` en el `next`, cada búsqueda descartada dejaría el indicador
encendido para siempre. Hay una prueba dedicada a ese caso.

Se añadió además una barra de progreso global en `app.html`, fuera del
`<main>` porque no pertenece a ninguna pantalla: refleja que hay red en
curso, la pida quien la pida.

## 2. Paso a paso — cómo lo hicimos

1. **Crear los tres interceptores** en `core/http/`.
2. **Crear `LoadingService`** con el contador global.
3. **Registrarlos en orden** en `app.config.ts`, con el razonamiento
   anotado.
4. **Quitar `toReadableError` de `IncidentApi`**: la capa de acceso vuelve a
   ser lo que debe ser, cinco métodos que construyen peticiones.
5. **Simplificar `IncidentService`**: su `request()` privado ya no cuenta
   peticiones ni traduce nada; solo registra el último mensaje de error.
6. **Añadir la barra de progreso global**.
7. **Pruebas** (18 nuevas): un spec por interceptor con
   `HttpTestingController`, que comprueban la cabecera única por petición,
   los cinco códigos de estado con su mensaje, la precedencia del mensaje
   del servidor, el respaldo para códigos no contemplados, y el contador
   con peticiones simultáneas, fallidas y canceladas.

   Además, el helper de pruebas pasó a registrar **la misma cadena de
   interceptores que la aplicación**, así que los 276 tests recorren ahora
   el camino real y no una versión simplificada.

8. **Verificar**:

   ```bash
   ng build                                          # sin errores
   ng test --watch=false --browsers=ChromeHeadless   # 276 SUCCESS
   ```

9. **Commit** con el mensaje sugerido por el reto:

   ```bash
   git commit -m "feat(http): add functional interceptors and global error handling"
   ```

## 3. Resultado

- Tres interceptores funcionales con su orden justificado.
- Los mensajes de error viven en un único sitio y cubren toda la aplicación.
- La carga se contabiliza sola, incluidas las peticiones canceladas.
- `IncidentApi` e `IncidentService` quedaron **más pequeños** que antes: el
  trabajo transversal se fue a donde le corresponde.
- 276 pruebas en verde (260 anteriores + 16 netas).
