# Día 15 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **consumo de API con `HttpClient`.**

## 1. Conceptos del día

### La API simulada

No hay servidor, pero sí hay HTTP de verdad. Un **interceptor** atiende las
peticiones a `/api/incidents` y responde desde memoria:
[`fake-backend.interceptor.ts`](../src/app/core/api/fake-backend.interceptor.ts).

```ts
provideHttpClient(withInterceptors([fakeBackendInterceptor]))
```

Frente a la alternativa de un servicio con datos en memoria, esto tiene una
ventaja decisiva: **el código de la aplicación es el definitivo**. Usa
`HttpClient`, Observables, verbos y códigos de estado reales. El día que
exista la API, se borra esa línea de `app.config.ts` y no cambia nada más.

El interceptor simula además dos cosas que un mock ingenuo no tiene:

- **Latencia** (400 ms), sin la cual el indicador de carga sería invisible y
  no se podría comprobar.
- **Fallos**, con un interruptor
  (`sessionStorage.setItem('fake-backend:fail', '1')`) para poder ver el
  camino de error en la aplicación real.

Detalle honesto: como el interceptor responde en el cliente, esas peticiones
**no salen a la red** y no aparecen en la pestaña Network del navegador. Son
peticiones reales para Angular, pero atendidas antes de llegar al
transporte.

### La capa de acceso HTTP

[`IncidentApi`](../src/app/core/api/incident-api.ts) tiene una única
responsabilidad: **hablar con el servidor**. Construir la URL, elegir el
verbo, tipar la respuesta:

```ts
getAll(): Observable<Incident[]> {
  return this.http.get<Incident[]>(BASE_URL).pipe(catchError(toReadableError));
}
```

No guarda estado, no aplica reglas de negocio y no sabe nada de la interfaz.
Eso deja tres capas bien separadas:

| Capa | Responsabilidad |
|---|---|
| `IncidentApi` | hablar HTTP |
| `IncidentService` | poseer el estado y las reglas |
| Componentes | mostrar |

Lo notable es que **los componentes no cambiaron** al pasar de memoria a
HTTP: siguen leyendo la misma señal `incidents` desde el Día 9. Esa era
justamente la promesa de aquel refactor, y hoy se cobró.

### Tipar las respuestas

`this.http.get<Incident[]>(...)` no valida nada en tiempo de ejecución: es
una promesa que se hace el desarrollador al compilador. Sirve para que el
resto del código esté tipado, pero **no protege** de que el servidor mande
otra cosa. Si eso fuera un riesgo real, haría falta validar el esquema al
entrar (con Zod o similar). Conviene saberlo para no confundir tipado con
validación.

### Traducir los errores en la frontera

Un `HttpErrorResponse` con `status: 404` no se le puede enseñar a nadie.
La traducción a lenguaje humano se hace en la capa de acceso:

```ts
const messages: Record<number, string> = {
  404: 'La incidencia solicitada no existe.',
  500: 'El servidor no pudo procesar la solicitud.',
};
```

Así ni el servicio ni los componentes tienen que saber qué es un código
HTTP. Es el mismo principio del Día 7 con los pipes: el dato técnico se
convierte en algo legible **una vez**, en el sitio que corresponde.

### Indicador de carga

El estado de carga es un **contador**, no un booleano:

```ts
private readonly pendingRequests = signal(0);
readonly loading = computed(() => this.pendingRequests() > 0);
```

Con un booleano, dos peticiones simultáneas se pisan: la primera en terminar
apagaría el indicador mientras la otra sigue en vuelo. El contador solo
llega a cero cuando no queda ninguna.

El decremento va en `finalize()`, que se ejecuta tanto si la petición
termina bien como si falla. Con un `tap` en el `next` se quedaría encendido
para siempre tras un error.

Y hay un tercer estado que no es ni «cargando» ni «hay datos»:

```ts
readonly loaded = this.initialized.asReadonly();
```

Sirve para distinguir **«no hay incidencias»** de **«todavía no han
llegado»**, que en pantalla son cosas muy distintas.

### Actualizar el estado solo cuando el servidor confirma

```ts
return this.request(this.api.create(incident)).pipe(
  tap((created) => this.collection.update((current) => [...current, created])),
);
```

La colección se modifica dentro del `tap`, es decir, **con la respuesta en
la mano**. Lo contrario —pintar el cambio de inmediato y deshacerlo si
falla— se llama actualización optimista, va bien para acciones muy
frecuentes y aquí habría sido complejidad sin necesidad. Hay una prueba que
fija esta decisión: tras llamar a `create()` y antes del `tick()`, la
colección todavía no ha cambiado.

## 2. Paso a paso — cómo lo hicimos

1. **Crear el interceptor** que simula la API, con su base de datos en
   memoria, latencia, códigos de estado y soporte para forzar fallos.

2. **Crear `IncidentApi`** con los cinco métodos (`getAll`, `getById`,
   `create`, `update`, `remove`) y la traducción de errores.

3. **Reescribir `IncidentService`** para apoyarse en la API: carga en el
   constructor, señales de `loading`, `error` y `loaded`, y un método
   privado `request()` que centraliza la contabilidad para no repetirla en
   cada operación.

4. **Adaptar los componentes**: los métodos que antes eran síncronos ahora
   devuelven Observables, así que las páginas se suscriben. La navegación
   tras crear o editar ocurre **solo si el servidor confirma**; si falla, el
   usuario se queda donde estaba con el mensaje delante.

5. **Añadir el indicador de carga y el aviso de error** como clases del
   sistema de diseño (`.loading` y `.error-banner`), usadas en el listado,
   el alta y la edición. El indicador va en `role="status"` (no interrumpe)
   y el error en `role="alert"` (sí interrumpe).

6. **Adaptar las pruebas.** Fue la parte más laboriosa: siete specs pasaron
   a montarse con `fakeAsync` y a esperar la carga inicial. Se creó un
   helper, [`testing/api-testing.ts`](../src/app/testing/api-testing.ts),
   para no repetir el montaje.

   Las pruebas usan **el mismo interceptor que la aplicación**, con latencia
   cero, así que recorren el camino completo (servicio → `HttpClient` →
   interceptor). Solo el spec de `IncidentApi` usa `HttpTestingController`,
   porque ahí lo que se comprueba es justamente la petición emitida: verbo,
   URL y cuerpo.

7. **Verificar en el navegador**:

   | Paso | Resultado |
   |---|---|
   | Carga inicial | spinner visible durante la petición, luego 5 tarjetas |
   | Eliminar (`DELETE`) | quedan 4 |
   | Crear (`POST`) | navega a `/incidents/inc-006` |
   | Editar (`PUT`) | el detalle muestra el título nuevo |
   | Forzar fallo | banner «El servidor no pudo procesar la solicitud.» |
   | Reintentar | vuelven las 5 y el banner desaparece |

   Capturas en [`img/dia-15-cargando.png`](img/dia-15-cargando.png) y
   [`img/dia-15-error.png`](img/dia-15-error.png).

   ```bash
   ng build                                          # sin errores
   ng test --watch=false --browsers=ChromeHeadless   # 238 SUCCESS
   ```

8. **Commit** con el mensaje sugerido por el reto:

   ```bash
   git commit -m "feat(api): integrate incident CRUD operations with REST API"
   ```

## 3. Un comportamiento que cambió de verdad

Hasta ayer, el botón «Restaurar lista» devolvía las incidencias borradas,
porque solo se habían quitado de un arreglo en memoria. Ahora la eliminación
llega al servidor: recargar **no** las trae de vuelta, y el botón pasó a
llamarse «Recargar», que es lo que hace.

Una prueba lo dejó claro al ponerse en rojo esperando las cinco incidencias
de siempre. No era un fallo: era la aplicación comportándose como una
aplicación con backend. Se reescribió para afirmar la conducta nueva.

## 4. Resultado

- CRUD completo contra `HttpClient`, con API simulada por interceptor.
- Tres capas separadas: HTTP, estado y presentación. Los componentes no se
  enteraron del cambio de origen de datos.
- Indicador de carga que resiste peticiones simultáneas y mensajes de error
  legibles con opción de reintentar.
- 238 pruebas en verde (231 anteriores + 7 netas, tras reescribir buena
  parte de las existentes para el mundo asíncrono).
