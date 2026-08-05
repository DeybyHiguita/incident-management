# Día 7 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **aplicar transformaciones de presentación sin alterar
> los datos originales.**

## 1. Conceptos del día

### Pipes integrados

Un *pipe* es una función de presentación que se aplica en la plantilla con
el operador `|`. Toma un valor, devuelve otro **nuevo** y no toca el
original. Angular trae varios de fábrica en `@angular/common`; en Angular
20 son *standalone*, así que se importan uno a uno en el componente que los
usa:

```ts
imports: [DatePipe, LowerCasePipe, TitleCasePipe, UpperCasePipe]
```

Si se olvida el import, el compilador de plantillas lo detecta:
`No pipe found with name 'date'`. Eso es una ventaja frente a los antiguos
`NgModule`: no hay pipes "disponibles por arte de magia", cada componente
declara lo que usa.

### `date` pipe

Formatea fechas (`string` ISO, `number` o `Date`) según un patrón y el
*locale* activo:

```html
<time [title]="incident().createdAt | date: 'full'">
```

Para que salga en español hubo que registrar el locale en
[`app.config.ts`](../src/app/app.config.ts), porque Angular solo incluye
`en-US` por defecto:

```ts
registerLocaleData(localeEs);
// ...
{ provide: LOCALE_ID, useValue: 'es' }
```

Con eso, `'full'` produce `lunes, 27 de julio de 2026, 4:15:00 (GMT-05:00)`
en lugar de `Monday, July 27, 2026...`.

### `titlecase`

Pone en mayúscula la primera letra de cada palabra y en minúscula el resto
(`'ACCESOS a la RED'` → `'Accesos A La Red'`). Lo aplicamos a la categoría
de la incidencia:

```html
{{ incident().category | titlecase }}
```

Nuestros datos simulados ya vienen bien escritos, así que hoy no cambia nada
visualmente. Se aplica igual como **normalización defensiva**: cuando las
categorías vengan de una API real, la tarjeta se verá consistente aunque el
backend las mande en mayúsculas o en minúsculas.

### `uppercase` y `lowercase`

Convierten todo el texto a mayúsculas o minúsculas. Los usamos con dos
propósitos distintos, que ilustran bien para qué sirven:

```html
<!-- uppercase: presentación — el identificador se lee mejor así -->
{{ incident().id | uppercase }}          <!-- inc-001 -> INC-001 -->

<!-- lowercase: derivar el nombre de una clase CSS a partir del dato -->
<span [class]="'badge badge--priority-' + (incident().priority | lowercase)">
```

El segundo caso es el que más código ahorró: en el Día 6 la prioridad
necesitaba un `@switch` con cuatro bloques `@case` (uno por valor, cada uno
repitiendo su clase y su etiqueta). Hoy son **dos líneas** — el pipe da la
etiqueta y `lowercase` deriva la clase.

### Pipes personalizados

Cuando la transformación es propia del dominio, se crea un pipe con
`ng generate pipe`. Creamos dos, en `shared/pipes/` porque no pertenecen a
ninguna pantalla concreta:

| Pipe | Entrada | Salida |
|---|---|---|
| [`IncidentPriorityPipe`](../src/app/shared/pipes/incident-priority-pipe.ts) | `'HIGH'` | `'Alta'` |
| [`RelativeTimePipe`](../src/app/shared/pipes/relative-time-pipe.ts) | `'2026-07-27T09:15:00Z'` | `'hace 9 días'` |

Un pipe es una clase con el decorador `@Pipe({ name })` que implementa
`PipeTransform`, es decir, un único método `transform`:

```ts
@Pipe({ name: 'incidentPriority' })
export class IncidentPriorityPipe implements PipeTransform {
  transform(value: IncidentPriority | string | null | undefined): string { ... }
}
```

El `RelativeTimePipe` usa `Intl.RelativeTimeFormat`, que es API nativa del
navegador: da "ayer", "hace 3 horas" o "mañana" en español sin añadir
ninguna librería de fechas al proyecto.

### Pipes puros

Un pipe es **puro** por defecto (`pure: true`). Eso significa que Angular
solo vuelve a ejecutarlo cuando **cambia la referencia** de su entrada, no
en cada ciclo de detección de cambios. Es una optimización importante: en
un listado de 100 tarjetas, un pipe impuro se ejecutaría cientos de veces
por cada clic.

De la pureza se derivan dos reglas que seguimos:

1. **Misma entrada → misma salida**, siempre. Hay un test que lo comprueba
   explícitamente en cada pipe.
2. **Sin efectos secundarios**: no modificar la entrada, no escribir en
   servicios, no leer estado cambiante.

Aquí aparece un detalle interesante del `RelativeTimePipe`: un tiempo
relativo depende de "ahora", que cambia constantemente. Si el pipe leyera
`Date.now()` por dentro, dejaría de ser reproducible. Por eso el instante de
referencia es un **argumento con valor por defecto**:

```ts
transform(value: ..., now: number | Date = Date.now()): string
```

En la aplicación se omite (usa la hora actual) y en las pruebas se pasa un
instante fijo, lo que las hace deterministas. La contrapartida, honesta: al
ser puro, el texto **no se refresca solo** con el paso del tiempo; una
tarjeta que dice "hace 5 minutos" seguirá diciéndolo hasta que algo provoque
un nuevo render. Para un tablero de incidencias es un compromiso aceptable;
si hiciera falta refrescarlo, la solución correcta **no** es marcar el pipe
como impuro, sino un `signal` con un temporizador que actualice la
referencia temporal.

### Responsabilidad de presentación

Es la razón de ser de todo lo anterior: **el dato del dominio no se toca; lo
que cambia es cómo se muestra.**

| Capa | Guarda | Ejemplo |
|---|---|---|
| Modelo (`Incident`) | el valor real | `priority: 'HIGH'`, `createdAt: '2026-07-27T09:15:00.000Z'` |
| Pipe | la traducción a lenguaje humano | `'Alta'`, `'hace 9 días'` |

Ventajas concretas de mantener esa separación:

- El `id` de la incidencia sigue siendo `'inc-001'` en memoria aunque en
  pantalla se lea `INC-001`: cualquier comparación, búsqueda o llamada a la
  API sigue funcionando.
- La traducción vive en **un solo sitio**. Cuando el Día 5 sacamos la
  tarjeta a un componente propio, las etiquetas de prioridad se quedaron
  dentro de ella; hoy están en `shared/` y las usan tanto la tarjeta como el
  panel de selección del listado.
- Los pipes se prueban solos, sin renderizar ningún componente:
  `new IncidentPriorityPipe().transform('HIGH')`.

## 2. Paso a paso — cómo lo hicimos

1. **Generar los pipes** con Angular CLI dentro de `shared/pipes/`:

   ```bash
   ng generate pipe shared/pipes/relative-time
   ng generate pipe shared/pipes/incident-priority
   ```

2. **Implementar `IncidentPriorityPipe`**: un `Record<IncidentPriority, string>`
   con las cuatro etiquetas y un `?? 'Sin definir'` como red de seguridad
   para valores que el tipo dice que no pueden llegar, pero que una API real
   podría enviar.

3. **Implementar `RelativeTimePipe`**: normaliza la entrada a milisegundos
   (acepta `string`, `number` y `Date`), recorre las unidades de mayor a
   menor (año → mes → día → hora → minuto) y delega el idioma en
   `Intl.RelativeTimeFormat('es', { numeric: 'auto' })`. La opción
   `numeric: 'auto'` es la que convierte "hace 1 día" en **"ayer"**.
   La división se trunca con `Math.trunc` para que 47 horas sean un día y no
   dos.

4. **Registrar el locale español** en `app.config.ts` con
   `registerLocaleData(localeEs)` y `LOCALE_ID`, para que `date` y
   `titlecase` respeten el idioma de la aplicación.

5. **Aplicar los pipes en la tarjeta**
   ([`incident-card.html`](../src/app/features/incidents/components/incident-card/incident-card.html)):

   - La prioridad pasó de un `@switch` de 22 líneas a una sola etiqueta con
     `incidentPriority` + `lowercase`.
   - La fecha ahora muestra `relativeTime` como texto visible, conservando
     el valor exacto en `datetime` (para las máquinas) y la fecha completa
     con `date: 'full'` en el `title` (para el ratón).
   - Se añadió una línea de referencia con el `id` en `uppercase` y la
     categoría en `titlecase` — un dato del modelo que hasta ahora no se
     mostraba.

6. **Reutilizar el pipe en el contenedor**: el panel "Incidencia
   seleccionada" del listado usa el mismo `incidentPriority`, lo que
   demuestra en el propio código que el pipe es reutilizable fuera de la
   tarjeta.

7. **Escribir las pruebas** de ambos pipes, sin `TestBed`: se instancian con
   `new` y se llama a `transform` directamente. Cubren los tres criterios de
   aceptación (consistencia, entradas inválidas, no mutación) y, en el caso
   de la prioridad, un test que falla si algún día se añade un valor al tipo
   `IncidentPriority` y se olvida traducirlo.

8. **Ajustar una prueba del Día 6**: comprobaba que el `<time>` mostraba
   `27/07/2026`, pero ahora ese texto es relativo. Se reescribió para
   verificar el `datetime`, el `title` y el prefijo del texto — de paso dejó
   de ser frágil al paso del tiempo.

9. **Verificar**:

   ```bash
   ng build                                          # sin errores
   ng test --watch=false --browsers=ChromeHeadless   # 58 SUCCESS
   ```

   Y sobre la app servida, con Chrome headless, se confirmó el render real:
   las 5 prioridades traducidas con su clase correcta, las 5 fechas
   relativas ("hace 7 días", "hace 26 días"...), los `title` en español
   (`lunes, 27 de julio de 2026, 4:15:00 (GMT-05:00)`) y las referencias
   `INC-001` … `INC-005` con su categoría.

10. **Commit** con el mensaje sugerido por el reto:

    ```bash
    git commit -m "feat(shared): add reusable incident presentation pipes"
    ```

## 3. Criterios de aceptación del día

| Criterio | Cómo se cumple |
|---|---|
| El pipe personalizado es reutilizable | Ambos viven en `shared/pipes/`, sin dependencias de ninguna pantalla. `incidentPriority` se usa hoy en dos componentes distintos (tarjeta y listado). |
| El pipe no modifica el objeto recibido | `transform` solo lee y devuelve un valor nuevo. Hay un test por pipe que compara el argumento antes y después de la llamada. |
| El resultado es consistente para entradas válidas | Los pipes son puros y sin estado; `RelativeTimePipe` recibe el instante de referencia como argumento en vez de leer el reloj. Test explícito de consistencia en cada uno. |
| Se contempla un comportamiento para entradas inválidas | `RelativeTimePipe` → `''` para `null`, `undefined`, cadena vacía, texto no parseable, `Date` inválido y `NaN`. `IncidentPriorityPipe` → `'Sin definir'` para `null`, `undefined` y cualquier código desconocido. 12 tests cubren estos casos. |

## 4. Resultado

- Dos pipes personalizados, puros y probados, más cuatro pipes integrados
  (`date`, `titlecase`, `uppercase`, `lowercase`) aplicados a la tarjeta.
- Aplicación en español: fechas formateadas con el locale `es`.
- El modelo `Incident` **no cambió ni una línea**: toda la transformación
  ocurre en la capa de presentación.
- 58 pruebas en verde (25 anteriores + 33 nuevas).
