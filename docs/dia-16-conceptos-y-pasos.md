# Día 16 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **RxJS y administración de flujos asíncronos.**

## 1. Conceptos del día

### De señal a señal, pasando por RxJS

Angular 20 permite tener lo mejor de los dos mundos con `rxjs-interop`:

```ts
private readonly searchResults = toSignal(
  toObservable(this.searchTerm).pipe(/* operadores */),
  { initialValue: [] as Incident[] },
);
```

- `toObservable` convierte la señal de la caja de texto en un flujo de
  valores.
- Los operadores hacen el trabajo que las señales no saben hacer: esperar,
  descartar, cancelar.
- `toSignal` devuelve el resultado al mundo de las señales.

Lo importante: **no hay ninguna suscripción manual**. `toSignal` se
suscribe y se da de baja solo cuando el componente se destruye, así que no
hay nada que limpiar. Es el tema del Día 17, y aquí ya se llega hecho.

La regla práctica: **las señales son buenas para el estado; RxJS, para el
tiempo.** Todo lo que sea «espera», «cancela», «descarta» o «combina en el
tiempo» es trabajo de RxJS.

### `debounceTime`: la espera

```ts
debounceTime(300)
```

Descarta los valores que llegan antes de que pasen 300 ms sin actividad.
Escribir «servidor» son ocho pulsaciones, pero **una sola petición**. Sin
esto, la aplicación bombardearía al servidor con búsquedas de resultados que
el usuario nunca llega a ver.

### `distinctUntilChanged`: sin duplicadas

Evita repetir una petición si el valor no ha cambiado respecto al anterior.
Combinado con el `map(term => term.trim())` de antes, `«red »` y `«red»` son
el mismo término y solo se consulta una vez.

El orden de los operadores importa: si el `trim` fuera después de
`distinctUntilChanged`, este vería dos cadenas distintas y dejaría pasar la
segunda petición.

### `switchMap`: la cancelación

Es el operador clave del día y la razón de no usar `mergeMap`:

| Operador | Qué hace con la petición anterior |
|---|---|
| `mergeMap` | la deja seguir; todas las respuestas llegan |
| `concatMap` | espera a que termine antes de lanzar la siguiente |
| `switchMap` | **la cancela** |

El problema que resuelve es real y difícil de depurar: si se busca
«impresora» y, antes de que responda, se busca «servidor», con `mergeMap`
puede llegar primero la respuesta de «servidor» y **después** la de
«impresora», dejando en pantalla resultados que no corresponden a lo
escrito. `switchMap` cancela la anterior, así que solo puede ganar la
última. Hay una prueba con latencia artificial que fuerza exactamente ese
escenario.

### Manejar el error sin romper el flujo

Esta es la trampa más sutil de RxJS. Un error **termina** el Observable: si
se atiende en el sitio equivocado, la búsqueda deja de funcionar para
siempre después del primer fallo.

```ts
switchMap((term) =>
  this.incidentApi.search(term).pipe(
    catchError((failure) => {           // ← DENTRO del switchMap
      this.searchError.set(failure.message);
      return of<Incident[]>([]);
    }),
  ),
),
```

Al estar **dentro** del `switchMap`, lo que muere es la petición fallida, no
el flujo que escucha la caja de texto. Si el `catchError` estuviera fuera,
un solo error dejaría el buscador inservible hasta recargar la página. Hay
una prueba que lo comprueba: provoca un fallo y después busca de nuevo con
éxito.

### El estado de carga

Se marca y se desmarca con `tap` alrededor de la petición, y se muestra
junto a la caja de texto con `aria-busy` y una región `aria-live`, para que
también se anuncie a quien no ve la pantalla.

### Qué se pide al servidor y qué no

Una decisión de diseño que costó una corrección: el término de búsqueda va
al servidor, pero **el término vacío no**.

```ts
filter((term) => term !== ''),
```

La primera versión consultaba también el término vacío, y eso tenía un
efecto visible: al abrir el listado no se veía nada durante los 300 ms del
debounce, porque los resultados aún no habían llegado. Además era una
petición redundante — el servicio ya había cargado la colección completa al
arrancar.

La versión final reparte así el trabajo:

| Qué | Dónde se resuelve | Por qué |
|---|---|---|
| Término de búsqueda | servidor | puede haber miles de incidencias |
| Filtros de estado y prioridad | cliente | son pocos valores, sobre datos ya cargados |
| Término vacío | cliente | es la colección que ya está en memoria |

Y los resultados del servidor se cruzan con la colección viva:

```ts
const alive = new Set(this.incidents().map((incident) => incident.id));
```

Así, al eliminar una incidencia que aparece en los resultados, desaparece al
instante **sin repetir la búsqueda**.

## 2. Paso a paso — cómo lo hicimos

1. **Dar soporte al filtro en la API simulada**: `GET /api/incidents?search=…`
   filtra por título y descripción, con el mismo endpoint que devuelve todo.

2. **Añadir `IncidentApi.search(term)`** con `HttpParams`.

3. **Montar el flujo reactivo** en `IncidentList` con los cinco operadores
   (`debounceTime`, `map`, `distinctUntilChanged`, `filter`, `switchMap`) y
   el `catchError` dentro del `switchMap`.

4. **Mostrar el estado** junto a la caja de texto: «Buscando…», el mensaje de
   error si falla, o la pista de que la búsqueda es remota.

5. **Pruebas** (11 nuevas para la búsqueda): que ocho teclas producen una
   sola petición, que el término normalizado no se repite, que gana la
   última búsqueda aunque la anterior sea más lenta, que un error no rompe el
   flujo y que eliminar quita el resultado sin volver a preguntar.

   Las pruebas usan `fakeAsync` con `tick(300)` para saltar el debounce, y
   `setFakeBackendLatency(50)` para forzar el escenario de respuestas
   desordenadas.

6. **Añadir un registro de peticiones al backend simulado**
   (`window.__fakeBackendCalls`). Hacía falta para poder verificarlo en el
   navegador: como el interceptor responde en el cliente, estas peticiones no
   aparecen en la pestaña Network.

7. **Medirlo en el navegador real**:

   | Acción | Peticiones |
   |---|---|
   | Teclear «servidor» (8 teclas), aún en debounce | 0 |
   | Tras la espera | **1** → `GET /api/incidents?search=servidor` |
   | Añadir un espacio al final | 0 (duplicada evitada) |
   | Vaciar la búsqueda | 0 (se usa lo ya cargado) |

   ```bash
   ng build                                          # sin errores
   ng test --watch=false --browsers=ChromeHeadless   # 243 SUCCESS
   ```

8. **Commit** con el mensaje sugerido por el reto:

   ```bash
   git commit -m "feat(search): implement reactive incident search with RxJS"
   ```

## 3. Resultado

- Búsqueda contra el servidor con espera, sin duplicadas, con cancelación de
  la anterior y con los errores contenidos.
- Sin suscripciones manuales: el flujo entra y sale del mundo de las señales.
- Reparto explícito entre lo que filtra el servidor y lo que filtra el
  cliente.
- 243 pruebas en verde (238 anteriores + 5 netas, tras reescribir las de
  filtros para el mundo asíncrono).
