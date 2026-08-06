# Día 10 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **administrar estado local mediante Signals.**
>
> El entregable de la actividad 7 está en
> [`dia-10-computed-vs-effect.md`](dia-10-computed-vs-effect.md).

## 1. Conceptos del día

### Signal

Un contenedor de un valor que **avisa cuando cambia**. Se lee llamándolo
como función y se escribe con `set()` o `update()`:

```ts
protected readonly searchTerm = signal('');

this.searchTerm.set('impresora');
```

Los venimos usando desde el Día 4, pero hasta hoy solo guardaban colecciones.
Lo nuevo es tratarlos como **el modelo de estado de la aplicación**: cada
dato que el usuario puede cambiar es un signal, y todo lo demás se deriva.

La clave es que la plantilla que lee `searchTerm()` queda suscrita
automáticamente. No hay que notificar a nadie ni pedir un refresco.

### `computed`: valores derivados

Un valor que se calcula a partir de otras señales y se mantiene al día solo:

```ts
protected readonly visibleIncidents = computed(() => {
  const criteria = this.criteria();
  return this.incidents().filter((incident) => criteria.matches(incident));
});
```

Es **perezoso** (no calcula hasta que alguien lee), **memorizado** (no
recalcula si nada cambió) y **se rastrea solo** (descubre sus dependencias
ejecutando la función). Y es de solo lectura: no tiene `set` ni `update`,
porque su valor no le pertenece.

### Cadenas de `computed`

Un `computed` puede derivar de otro. Hoy hay una cascada de cuatro niveles:

```
searchTerm ─┐
statusFilter├─> criteria ─> visibleIncidents ─> visibleCount
priorityFilter ─┘              ↑
                        incidents (servicio)
```

Al teclear una letra solo se escribe **un** signal. Angular recalcula la
cascada en orden, una sola vez, y solo lo que de verdad dependía del cambio.
Eso es lo que permite escribir la lógica en trozos pequeños y legibles sin
pagarlo en rendimiento.

### Estado del dominio vs. estado de la vista

La decisión de diseño más importante del día fue **dónde** poner cada
signal. Se mantuvo la frontera que se documentó el Día 9:

| Estado | Dónde vive | Por qué |
|---|---|---|
| La colección | `IncidentService` | es del dominio: todas las vistas ven las mismas incidencias |
| `totalCount`, `criticalCount`, `openCount` | `IncidentService` | describen el dominio, no una pantalla |
| `searchTerm`, `statusFilter`, `priorityFilter` | `IncidentList` | dos listados abiertos a la vez podrían filtrar distinto |
| `selectedId` | `IncidentList` | igual: cada vista tiene su propia selección |

La regla práctica: **si dos vistas pudieran tener valores distintos al mismo
tiempo, el estado no es del servicio.**

Esto se aprecia en la aplicación: los indicadores de arriba cuentan sobre
**toda** la colección y no cambian al filtrar; el contador "Mostrando X de
Y" sí. Son dos preguntas distintas y cada una vive donde le corresponde.

### Inmutabilidad

Una señal detecta el cambio comparando **referencias**. Si se muta el
arreglo, la referencia es la misma y no se entera nadie:

```ts
// ❌ La vista no se actualizaría
this.collection().push(incident);

// ✅ Arreglo nuevo: la señal notifica
this.collection.update((current) => [...current, incident]);
```

Por eso en todo el proyecto no hay ni un `push`, `splice`, `sort` ni
`reverse` sobre el estado — se verificó con una búsqueda en todo `src/app`.

### No almacenar lo que se puede calcular

El criterio del día. Los tres indicadores **no** son campos que se
actualicen a mano en cada alta y cada baja, sino `computed`:

```ts
readonly totalCount = computed(() => this.collection().length);
```

Guardarlos aparte obligaría a acordarse de actualizarlos en `create()`, en
`remove()`, en `reset()` y en cada método futuro. Con `computed` es
imposible que se desincronicen. El razonamiento completo, y por qué `effect`
no es el sustituto, está en
[`dia-10-computed-vs-effect.md`](dia-10-computed-vs-effect.md).

## 2. Paso a paso — cómo lo hicimos

1. **Indicadores derivados en el servicio**: tres `computed` sobre la
   colección (`totalCount`, `criticalCount`, `openCount`). La colección ya
   era un `signal` desde el Día 9, así que la actividad 1 estaba cubierta.

2. **Signals de búsqueda y filtros en el contenedor**: `searchTerm`,
   `statusFilter` y `priorityFilter`, con `''` como "no filtrar por este
   campo".

3. **Derivar la lista visible**: un `computed` construye un
   `IncidentSearchCriteria` (la clase del Día 2) con los tres filtros, y otro
   filtra la colección con él. `visibleCount` y `hasActiveFilters` cuelgan de
   ahí.

4. **Interfaz**: panel de tres indicadores, barra de búsqueda con dos
   selectores y un botón de limpiar, contador de resultados en una región
   `aria-live`, y un mensaje de vacío distinto según haya filtros activos o
   no (no es lo mismo "no hay nada" que "nada coincide").

   Se mantuvieron los criterios del Día 6: cada control con su `<label>`
   asociada, campos que se encogen sin desbordar y estilos con los tokens
   del sistema de diseño.

5. **Pruebas** (22 nuevas): que los indicadores cuentan bien y se recalculan
   solos al crear, eliminar y reiniciar; que cada filtro funciona por
   separado y los tres combinados; que el contador cambia pero los
   indicadores no; que el filtro se sigue aplicando cuando cambian los datos
   del servicio; y que el mensaje de vacío es el correcto en cada caso.

6. **Evidencia de actualización reactiva**: se automatizó el navegador para
   escribir en el filtro y eliminar una incidencia, leyendo el DOM en cada
   paso:

   | Acción | Tarjetas | Contador | Indicadores |
   |---|---|---|---|
   | Inicial | 5 | Mostrando 5 de 5 | Totales=5, Críticas=1, Abiertas=1 |
   | Buscar "servidor" | 1 | Mostrando 1 de 5 | *sin cambios* |
   | Filtrar CRITICAL | 1 | Mostrando 1 de 5 | *sin cambios* |
   | Eliminarla | 0 | Mostrando 0 de 4 | Totales=4, **Críticas=0** |

   Las capturas están en [`img/dia-10-indicadores.png`](img/dia-10-indicadores.png)
   y [`img/dia-10-filtro-aplicado.png`](img/dia-10-filtro-aplicado.png).

7. **Corregir un fallo del Día 8 detectado al revisar la captura**: la
   directiva `appIncidentHighlight` aplicaba la clase `is-critical`, pero el
   resaltado **no se veía**. La causa: los estilos de componente llevan un
   atributo de encapsulación (`.incident-card[_ngcontent-x]`), lo que les da
   más especificidad que la clase global, y además el `border` del shorthand
   pisaba `border-inline-start`.

   Se añadió la variante `&.is-critical` dentro de `incident-card.scss` y,
   sobre todo, una prueba que valida el **efecto visual** con
   `getComputedStyle` y no solo la presencia de la clase — que es
   exactamente lo que se le había escapado a las pruebas del Día 8.

8. **Verificar**:

   ```bash
   ng build                                          # sin errores
   ng test --watch=false --browsers=ChromeHeadless   # 121 SUCCESS
   ```

9. **Commit** con el mensaje sugerido por el reto:

   ```bash
   git commit -m "feat(state): manage incident state with Angular signals"
   ```

## 3. Criterios de aceptación del día

| Criterio | Cómo se cumple |
|---|---|
| El estado se actualiza de forma inmutable | Siempre arreglos nuevos (`[...current, x]`, `filter`). Verificado con una búsqueda: no hay ni un `push`/`splice`/`sort`/`reverse` fuera de las pruebas. |
| Los valores derivados utilizan `computed` | 9 `computed` en total: 3 en el servicio y 6 en el contenedor. Ninguno tiene `set` ni `update`, y hay una prueba que lo comprueba. |
| No se almacenan valores que puedan calcularse | Los contadores, la lista visible, los criterios y la incidencia seleccionada se calculan. Los únicos `signal` son los que el usuario cambia directamente. |
| No se utiliza `effect` para reemplazar un `computed` | No hay **ningún** `effect` en el proyecto; verificado con una búsqueda en todo `src/app`. El razonamiento está documentado aparte. |

## 4. Resultado

- Estado repartido con criterio: dominio en el servicio, vista en el
  componente.
- Tres indicadores y una cascada de derivados que se mantienen al día solos,
  sin una sola línea de sincronización manual.
- Búsqueda y filtros combinables sobre la colección del servicio.
- Un fallo visual heredado del Día 8, encontrado y corregido, con una prueba
  que impide que se repita.
- 121 pruebas en verde (100 anteriores + 21 nuevas).
