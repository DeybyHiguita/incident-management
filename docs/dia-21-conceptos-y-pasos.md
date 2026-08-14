# Día 21 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **estado compartido con Signals.**

## 1. Conceptos del día

### Qué es un *store*

Un almacén de estado es un servicio con una estructura muy concreta:

```
estado privado (signal)  →  selectores (computed)  →  acciones (métodos)
       ↑ nadie de fuera        ↑ solo lectura            ↑ la única vía
         lo escribe              para la vista             de escritura
```

No es una librería ni un patrón exótico: es
[`IncidentStore`](../src/app/core/state/incident-store.ts), un
`@Injectable` con signals privadas y métodos públicos. Angular no necesita
NgRx para esto desde que existen las señales.

### Las tres capas

**Estado privado.** Todo `private`, sin excepción:

```ts
private readonly incidentList = signal<readonly Incident[]>([]);
private readonly selectedIncidentId = signal<string | null>(null);
private readonly lastError = signal<string | null>(null);
private readonly initialized = signal(false);
private readonly activeFilters = signal<IncidentFilters>(NO_FILTERS);
```

**Selectores.** Lo único que ve la vista, todo de solo lectura:

```ts
readonly incidents = this.incidentList.asReadonly();
readonly totalCount = computed(() => this.incidentList().length);
readonly visibleIncidents = computed(() => { … });
```

**Acciones.** Nombradas por la **intención**, no por la asignación:
`select(id)` y no `setSelectedId(id)`; `clearFilters()` y no
`setFilters(NO_FILTERS)`. La diferencia importa porque una acción puede
hacer más de una cosa:

```ts
remove(id: string): Observable<void> {
  return this.track(this.api.remove(id)).pipe(
    tap(() => {
      this.incidentList.update((current) => current.filter((i) => i.id !== id));
      // Si la eliminada estaba seleccionada, la selección deja de tener sentido.
      if (this.selectedIncidentId() === id) {
        this.selectedIncidentId.set(null);
      }
    }),
  );
}
```

Esa coherencia —eliminar limpia la selección— vive en el store. Si cada
componente tuviera que acordarse, tarde o temprano uno se olvidaría.

### Qué protege de verdad al estado

El criterio del día es que los componentes no modifiquen el estado
directamente. Conviene ser preciso sobre **qué lo impide**, porque una
prueba nos corrigió aquí:

| Mecanismo | Cuándo actúa | Qué impide |
|---|---|---|
| `private` | compilación | que un componente **escriba** `store.incidentList` |
| `asReadonly()` | ejecución | que llame a `set` o `update` sobre lo expuesto |

`private` es de TypeScript y **desaparece al compilar**: los campos internos
sí existen en tiempo de ejecución. Escribimos una prueba que afirmaba lo
contrario y falló, con razón. La garantía en ejecución es `asReadonly()`, y
así quedó anotado en el propio test.

### Un cambio de criterio respecto al Día 10

El Día 10 se argumentó que los filtros eran estado **de la vista** y por eso
vivían en el componente. Hoy se han movido al store, siguiendo lo que pide
el reto. Es un cambio de postura, no un descuido, y tiene su porqué:

| | Filtros en el componente (Día 10) | Filtros en el store (hoy) |
|---|---|---|
| Dos listados a la vez | cada uno con su filtro | comparten filtro |
| Volver de otra pantalla | se pierden | **se conservan** |
| Dónde está la lógica | repartida | en un sitio |

Lo que se gana se ve en el navegador: se filtra, se navega al panel, se
vuelve… y el filtro y la selección **siguen puestos**. Con el diseño
anterior se perdían. Para una herramienta de trabajo, eso es lo deseable.

Lo que se pierde: si algún día hicieran falta dos listados independientes en
la misma pantalla, compartirían filtro. El día que pase, la solución es un
store por instancia (`providedIn` en el componente), no volver atrás.

### Qué NO se llevó al store

No todo el estado es de dominio. Se quedaron en el componente:

```ts
protected readonly searching = signal(false);
protected readonly searchError = signal<string | null>(null);
protected readonly autoRefresh = signal(false);
```

Y también el flujo RxJS de la búsqueda, con su `debounceTime(300)`. El
motivo: la espera y la cancelación son decisiones de **interacción** —
dependen de lo rápido que teclee una persona—, no del dominio. El store solo
recibe el resultado a través de una acción, `setSearchResults()`.

La regla que aplicamos: **si describe los datos, va al store; si describe la
pantalla, se queda fuera.**

## 2. Paso a paso — cómo lo hicimos

1. **Crear `IncidentStore`** en `core/state/`, con las tres capas.
2. **Migrar los cinco consumidores** (listado, detalle, alta, edición,
   panel) para que lean selectores y llamen acciones.
3. **Eliminar `IncidentService`**: el store lo sustituye por completo. No se
   deja como envoltorio para evitar dos formas de hacer lo mismo.
4. **Adaptar el helper de pruebas**, que ahora devuelve el store.
5. **Trasladar el spec del servicio al store** conservando toda su
   cobertura, y añadir bloques nuevos de selección, filtros y encapsulación.
6. **Verificar en el navegador** que el estado sobrevive a la navegación:

   | Paso | Tarjetas | Contador | Selección |
   |---|---|---|---|
   | Listado | 5 | 5 de 5 | ninguna |
   | Filtrar MEDIUM y seleccionar | 2 | 2 de 5 | «Solicitud de acceso…» |
   | Ir al panel | — | — | — |
   | **Volver** | **2** | **2 de 5** | **«Solicitud de acceso…»** |

   ```bash
   ng build                                          # sin errores
   ng test --watch=false --browsers=ChromeHeadless   # 350 SUCCESS
   ```

7. **Commit** con el mensaje sugerido por el reto:

   ```bash
   git commit -m "feat(state): centralize incident state in signal store"
   ```

## 3. Dos tropiezos del refactor

**El renombrado automático se pasó de listo.** Al sustituir la palabra
`service` por `store` en los specs, el guion de `user-service` cuenta como
límite de palabra, así que quedó `user-store` y dejó de compilar. Un
reemplazo masivo necesita revisar qué tocó, no solo que termine.

**Un corte mal hecho dejó una llave de más.** Al eliminar del spec heredado
el bloque de `search(criteria)` —que ya no existe en el store—, el corte se
llevó una llave y cerró el `describe` antes de tiempo. El síntoma fue
desconcertante (`Cannot find name 'start'`) y la causa, trivial.

## 4. Resultado

- Un único almacén con la colección, la selección, la carga, el error y los
  filtros.
- Señales de solo lectura hacia fuera; toda escritura pasa por una acción
  con nombre de intención.
- El estado sobrevive a la navegación entre pantallas.
- `IncidentService` eliminado: una sola forma de acceder al estado.
- 350 pruebas en verde (333 anteriores + 17 netas).
