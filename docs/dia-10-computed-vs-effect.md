# Día 10 — Cuándo usar `computed` y cuándo no usar `effect`

> Actividad 7 del Día 10: documentar cuándo debe utilizarse `computed` y
> cuándo **no** debe utilizarse `effect`.

## La regla en una frase

**Si el valor se puede calcular a partir de otros, es un `computed`.**
`effect` es solo para lo que ocurre *fuera* del mundo de las señales.

## Las tres piezas

| | Qué es | Se escribe con |
|---|---|---|
| `signal` | estado propio: no se deduce de nada | `set()`, `update()` |
| `computed` | estado derivado: se deduce de otras señales | no se escribe |
| `effect` | efecto secundario: sale del sistema reactivo | no devuelve nada |

En el listado se ven las tres categorías (bueno, las dos primeras — la
tercera no hizo falta):

```ts
// signal: nadie puede calcular qué escribió el usuario
protected readonly searchTerm = signal('');

// computed: esto SÍ se deduce
protected readonly visibleIncidents = computed(() => { … });
protected readonly visibleCount = computed(() => this.visibleIncidents().length);
```

## Por qué `computed` y no un `signal` que se actualiza a mano

La tentación es guardar el resultado:

```ts
// ❌ Estado duplicado
readonly totalCount = signal(0);

create(draft) {
  this.collection.update(…);
  this.totalCount.update((n) => n + 1); // hay que acordarse SIEMPRE
}
remove(id) {
  this.collection.update(…);
  this.totalCount.update((n) => n - 1); // y aquí también
}
```

```ts
// ✅ Una sola fuente de verdad
readonly totalCount = computed(() => this.collection().length);
```

Con la versión de arriba, el día que alguien añada un método `importMany()`
y olvide tocar `totalCount`, el contador miente y no hay ningún error que lo
avise. Con `computed` es **imposible** que se desincronice: no existe un
segundo sitio donde guardar la verdad.

Tres propiedades que se ganan gratis:

1. **Perezoso**: no se calcula hasta que alguien lo lee.
2. **Memorizado**: si nadie cambió sus dependencias, devuelve el valor
   anterior sin recalcular.
3. **Se rastrea solo**: `computed` descubre de qué señales depende
   *ejecutándolas*. No hay que declarar dependencias a mano, y si el cálculo
   toma un camino distinto, las dependencias se ajustan solas.

## Cuándo NO usar `effect`

Este es el antipatrón que el criterio del día pide evitar:

```ts
// ❌ effect usado para calcular
readonly visibleCount = signal(0);

constructor() {
  effect(() => {
    this.visibleCount.set(this.visibleIncidents().length);
  });
}
```

Funciona, pero es peor en todo:

- **Se ejecuta siempre**, aunque nadie mire el valor.
- **Va un paso por detrás**: el efecto corre *después* del cambio, así que
  existe un instante en el que la lista ya cambió pero el contador todavía
  no.
- **Duplica el estado**: vuelve el problema de la sección anterior.
- **Escribir señales dentro de un `effect`** es justo lo que puede provocar
  ciclos de actualización.

Una señal de alarma sencilla: **si dentro de un `effect` aparece un
`.set()` sobre otra señal, casi siempre debería ser un `computed`.**

## Cuándo sí tiene sentido un `effect`

Cuando hay que **salir** del sistema reactivo — sincronizar con algo que no
son señales:

- escribir en `localStorage`;
- cambiar el `document.title`;
- registrar analítica o trazas;
- integrarse con una librería de terceros que no entiende señales.

Todos tienen algo en común: **no producen un valor que la plantilla vaya a
leer**. Si el resultado se va a pintar, es un `computed`.

## Qué hay hoy en el proyecto

No se usa **ningún** `effect`, y no es casualidad: no hay nada que
sincronizar fuera del mundo reactivo. Todo lo derivado son `computed`:

| Dónde | `computed` | Se deriva de |
|---|---|---|
| `IncidentService` | `totalCount` | la colección |
| `IncidentService` | `criticalCount` | la colección |
| `IncidentService` | `openCount` | la colección |
| `IncidentList` | `criteria` | los tres filtros |
| `IncidentList` | `visibleIncidents` | la colección + `criteria` |
| `IncidentList` | `visibleCount` | `visibleIncidents` |
| `IncidentList` | `hasActiveFilters` | los tres filtros |
| `IncidentList` | `selectedIncident` | la colección + `selectedId` |
| `IncidentList` | `isRestoreDisabled` | la colección |

Fíjate en que `visibleCount` deriva de `visibleIncidents`, que a su vez
deriva de `criteria`: **los `computed` se encadenan**. Al teclear una letra
en el buscador solo se escribe un `signal`, y toda esa cascada se recalcula
sola, en orden y una sola vez.

Se puede comprobar en la aplicación: al filtrar, la lista y el contador
"Mostrando X de Y" cambian, pero los tres indicadores de arriba **no** — y
es correcto, porque cuentan sobre toda la colección, no sobre lo filtrado.
Al eliminar una incidencia crítica, en cambio, bajan los dos a la vez.
