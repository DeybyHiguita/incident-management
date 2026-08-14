# Día 22 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **filtros, ordenamiento y paginación.**

## 1. Conceptos del día

### La cadena de derivación

Todo el día cabe en una idea: **filtrar, ordenar y paginar son tres pasos
encadenados**, y cada uno es un `computed` que parte del anterior.

```
incidencias
   ↓ filtros (estado, prioridad, categoría, búsqueda)
visibleIncidents  ──→ visibleCount  (el total de resultados)
   ↓ orden (fecha o prioridad)
   ↓ página actual y tamaño
pagedIncidents    ──→ esto es lo que se pinta
```

El orden de los pasos no es negociable: paginar antes de ordenar daría
páginas con contenido arbitrario, y ordenar antes de filtrar sería trabajo
tirado.

### Ordenar por prioridad no es ordenar alfabéticamente

Si se ordena por el texto del valor, el resultado es CRITICAL, HIGH, LOW,
MEDIUM: un orden que no significa nada. Hace falta declarar el orden **de
gravedad**:

```ts
const PRIORITY_RANK = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
```

Dos detalles más del comparador:

**Ordenar sobre una copia.** `Array.prototype.sort` **muta el arreglo**. Como
lo que se ordena viene de un `computed`, ordenarlo en su sitio corrompería
el estado del que deriva:

```ts
return [...incidents].sort(…);   // nunca `incidents.sort(…)`
```

**Desempate estable.** Dos incidencias con la misma prioridad podrían
intercambiarse entre renders. Un desempate por `id` las deja siempre en el
mismo orden:

```ts
return comparison !== 0 ? comparison * factor : a.id.localeCompare(b.id);
```

### Paginación: recortar en vez de corregir

El problema clásico: el usuario está en la página 3, aplica un filtro que
deja una sola página, y se queda mirando una lista vacía.

La solución habitual es reaccionar al filtro para corregir la página. La que
se usó aquí es más simple: **no guardar la página efectiva, calcularla**.

```ts
readonly currentPageNumber = computed(() =>
  Math.min(Math.max(1, this.currentPage()), this.totalPages()),
);
```

Así no hay nada que sincronizar. El estado guarda «la página que pidió el
usuario» y el selector devuelve «la que existe». Es el mismo principio del
Día 10: no almacenar lo que se puede calcular.

Aun así, cambiar un filtro **sí** vuelve explícitamente a la página 1,
porque los resultados son otros y seguir en la 2 sería desconcertante.

Dos decisiones pequeñas con su porqué:

- `totalPages` nunca baja de 1: «página 1 de 1» se entiende; «página 1 de 0»
  no.
- El tamaño de página por defecto es **4**, un número deliberadamente
  pequeño para que la paginación sea observable con las cinco incidencias
  simuladas.

### Categorías derivadas, no una lista maestra

Las categorías del filtro salen de las propias incidencias:

```ts
readonly categories = computed(() =>
  [...new Set(this.incidentList().map((i) => i.category))].sort((a, b) => a.localeCompare(b, 'es')),
);
```

Ventaja concreta: al registrar una incidencia con una categoría nueva,
**aparece sola** en el desplegable. Hay una prueba que lo comprueba. El
`localeCompare` con `'es'` es lo que coloca bien las palabras acentuadas.

### La URL como estado compartible

Sincronizar los filtros con los parámetros de consulta convierte la pantalla
en algo que se puede **compartir y recargar**:

```
/incidents?categoria=Hardware&orden=priority&dir=asc
```

La sincronización vive en el componente, **no en el store**. El estado del
dominio no debe saber que existe un enrutador; el store guarda filtros y la
URL es una forma de presentarlos.

Son dos direcciones:

1. **Al entrar**, se leen los parámetros y se vuelcan en el store.
2. **Al cambiar el estado**, un `effect` reescribe la URL.

Ese `effect` es de los legítimos que se describían el Día 10: no calcula un
valor para la plantilla, sincroniza con algo externo al sistema reactivo.

Dos cuidados:

- **`replaceUrl: true`.** Sin esto, cada tecleo en el buscador dejaría una
  entrada en el historial y salir de la pantalla exigiría pulsar «atrás»
  quince veces.
- **Los valores por defecto no se escriben.** Se ponen a `null`, y Angular
  los omite. Sin filtros, la URL queda limpia: `/incidents`.

## 2. Un fallo que solo apareció al verificar en el navegador

Al recargar `/incidents?categoria=Hardware`, el filtro se aplicaba —salía
una sola incidencia— pero **el desplegable aparecía en blanco**.

La causa: las opciones de categoría se derivan de los datos, que llegan por
HTTP. Al montarse el `<select>`, la lista aún estaba vacía, así que el
`[value]="filters().category"` apuntaba a una opción que todavía no existía.
Cuando las opciones llegaron, la expresión no había cambiado y Angular no
reasignó nada.

La solución fue marcar la selección en cada `<option>` en lugar de en el
`<select>`:

```html
<option [value]="category" [selected]="category === filters().category">
```

Así la opción nace ya seleccionada, exista antes o después.

Ninguna prueba lo detectaba porque todas partían de los datos ya cargados.
Se añadió una que reproduce el caso, y esta es la lección repetida del reto:
**la verificación en el navegador encuentra cosas que las pruebas no**,
sobre todo en el arranque y en los tiempos de carga.

## 3. Paso a paso — cómo lo hicimos

1. **Ampliar los filtros del store** con `category`, y añadir el selector
   `categories` derivado de la colección.
2. **Añadir el ordenamiento**: estado `sort`, mapa de gravedad, comparador
   sobre copia con desempate estable, y las acciones `setSort` y
   `toggleSort`.
3. **Añadir la paginación**: `page`, `pageSize` y los selectores
   `totalPages`, `currentPageNumber`, `pagedIncidents`, `pageRange`,
   `hasPreviousPage` y `hasNextPage`.
4. **Volver a la página 1** al cambiar filtros u orden.
5. **Interfaz**: desplegables de categoría y de orden, controles de
   paginación en un `<nav>` con `aria-label`, estado de página en una región
   `aria-live` y selector de tamaño de página.
6. **Sincronizar con la URL** en las dos direcciones.
7. **Mostrar el total de resultados** con el rango: «Mostrando 1–4 de 5
   resultados (filtrados de 5)».
8. **Pruebas** (33 nuevas): 24 del store —orden por gravedad y no
   alfabético, que ordenar no muta, que nada se repite ni se pierde entre
   páginas, que la página se recorta sola al filtrar— y 9 de la interfaz,
   incluida la sincronización con la URL.

   Las pruebas antiguas del listado se aislaron de la paginación con
   `store.setPageSize(50)` en el montaje, y se cambió la búsqueda de
   tarjetas **por identidad** en vez de por posición, porque el orden por
   defecto ya no es el del arreglo de datos simulados.

9. **Verificar en el navegador**:

   | Acción | URL | Resultado |
   |---|---|---|
   | Inicial | `/incidents` | 4 tarjetas, «Página 1 de 2» |
   | Siguiente | `?pagina=2` | 1 tarjeta, «Página 2 de 2» |
   | Ordenar por gravedad | `?orden=priority&dir=desc` | primera: la crítica |
   | Filtrar categoría | `?categoria=Hardware&orden=…` | 1 de 5 |
   | **Recargar** | misma URL | mismo estado, controles incluidos |

   ```bash
   ng build                                          # sin errores
   ng test --watch=false --browsers=ChromeHeadless   # 383 SUCCESS
   ```

10. **Commit** con el mensaje sugerido por el reto:

    ```bash
    git commit -m "feat(filters): add incident filtering sorting and pagination"
    ```

## 4. Resultado

- Cuatro filtros combinables, dos criterios de orden en ambas direcciones y
  paginación con tamaño configurable.
- Nada que sincronizar a mano: la página efectiva se calcula en lugar de
  corregirse.
- El estado de la pantalla vive en la URL: se puede compartir, recargar y
  guardar en marcadores.
- 383 pruebas en verde (350 anteriores + 33 nuevas).
