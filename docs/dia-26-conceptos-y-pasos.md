# Día 26 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **rendimiento y detección de cambios.**

## 1. La auditoría inicial

Antes de optimizar nada conviene saber qué hay. Cuatro búsquedas sobre el
código:

| Qué se buscó | Resultado |
|---|---|
| Componentes con `OnPush` | **6 de 19** |
| Métodos llamados desde plantillas | `showError()`, `fieldError()`… |
| Expresiones `track` | **todas correctas** |
| Objetos creados en plantillas | `[detailLink]="['/incidents', id]"` |

Que `track` estuviera bien no es casualidad: es obligatorio en `@for` desde
el Día 4, y se eligió `incident.id` por ser estable. El Día 12 se cambió un
`track $index` por `track tag` justamente por un fallo que provocó.

## 2. La medición (actividad 6)

> **De dónde salen estos números y cómo repetirlos**:
> [`medir-rendimiento.md`](medir-rendimiento.md). Incluye la utilidad
> `measureChangeDetection()`, que usa el profiler del propio Angular, y por
> qué `ng.profiler` no existe en Angular 20.

Optimizar sin medir es adivinar. La medición se hizo instrumentando los
métodos de plantilla y contando cuántas veces se ejecutan en **10 ciclos de
detección** sin que cambie nada.

**Antes**, en la pantalla de inicio de sesión (sin `OnPush`):

```
{"showError": 120, "fieldError": 0}
```

**120 llamadas en 10 ciclos**, o sea **12 por ciclo**, sin que el usuario
tocara nada. `fieldError` marcaba 0 porque solo se evalúa cuando hay error
visible.

**Después** de las optimizaciones:

```
{"visibleErrors": 0}
```

Cero. Y la primera medición dio una sorpresa útil: al hacerla sobre el
formulario de incidencias, que **ya tenía `OnPush` desde el Día 11**, el
resultado era 0 desde el principio. Es la mejor demostración de para qué
sirve la estrategia.

## 3. Conceptos del día

### `OnPush`: de «reviso todo» a «reviso lo que cambió»

Por defecto, Angular revisa **todos** los componentes en cada ciclo de
detección, y un ciclo se dispara con cualquier evento: un clic, una
respuesta HTTP, un temporizador. Con `OnPush`, un componente solo se revisa
si:

- cambia la **referencia** de uno de sus inputs,
- se dispara un evento dentro de él,
- o cambia una **señal** que su plantilla lee.

Esa tercera condición es la que hace que `OnPush` sea casi gratis en este
proyecto: desde el Día 21 el estado son señales, así que Angular sabe
exactamente qué repintar. Pasaron los 19 componentes sin tener que añadir
un solo `markForCheck()`.

### Métodos en plantillas: el coste invisible

```html
{{ fieldError('email') }}    <!-- se ejecuta en CADA ciclo -->
```

Angular no puede saber si el resultado cambió, así que vuelve a llamar. El
problema no es una llamada, son doce por ciclo multiplicadas por cada ciclo
de la aplicación.

La alternativa es un **valor derivado**: se calcula cuando cambia algo de lo
que depende, y el resto del tiempo devuelve lo cacheado.

Pero hay un obstáculo real: **un `FormGroup` no es reactivo para las
señales**. Sus cambios de valor y de estado no despiertan a ningún
`computed`. La solución es convertir su flujo de eventos en señal:

```ts
private readonly formState = toSignal(this.form.events, { initialValue: null });

protected readonly visibleErrors = computed(() => {
  this.formState();        // dependencia: cualquier cambio del formulario
  this.submitAttempted();  // …o un intento de envío
  return { email: this.errorFor('email'), password: this.errorFor('password') };
});
```

Es el mismo puente del Día 16 (`toObservable`/`toSignal`), en la otra
dirección.

### Objetos y arreglos creados en la plantilla

Este es sutil y aparece **precisamente al activar `OnPush`**:

```html
<app-incident-card [detailLink]="['/incidents', incident.id]" />
```

Cada evaluación crea un **arreglo nuevo**. Dos arreglos con el mismo
contenido no son `===`, así que el hijo con `OnPush` ve su input como
«cambiado» en cada ciclo y se repinta siempre. La optimización queda
anulada por la forma de pasar el dato.

El arreglo se cambió por una cadena:

```html
<app-incident-card [detailLink]="'/incidents/' + incident.id" />
```

Dos cadenas iguales **sí** son `===`. `routerLink` acepta ambas formas, así
que no se pierde nada.

Queda uno sin tocar, y a propósito:

```html
[routerLinkActiveOptions]="{ exact: true }"
```

También crea un objeto nuevo, pero `RouterLinkActive` no es `OnPush` ni
compara por referencia para eso. Cambiarlo sería complicar el código sin
ganar nada — y eso también es parte de optimizar: **saber qué no tocar**.

### Lo que no hizo falta cambiar

- **`track`**: los cinco usos ya eran estables (`incident.id`, `tag`,
  `category`, `user.id`, `size`).
- **Los selectores del store**: ya eran `computed` desde el Día 21, así que
  filtrar, ordenar y paginar se cachean solos.

## 4. Paso a paso — cómo lo hicimos

1. **Auditar** con búsquedas sobre el código, no de memoria.
2. **Medir** el estado inicial: 120 llamadas en 10 ciclos.
3. **Activar `OnPush`** en los 13 componentes que no lo tenían.
4. **Sustituir los métodos de plantilla** del inicio de sesión por un
   `computed` alimentado por `form.events`.
5. **Cambiar `detailLink`** de arreglo a cadena.
6. **Medir de nuevo**: 0.
7. **Convertir la medición en pruebas permanentes**, para que la
   optimización no se pierda en el próximo cambio:

   - que `visibleErrors()` devuelve la **misma referencia** si nada cambió;
   - que **sí** cambia cuando el formulario cambia;
   - que el componente sigue declarando `OnPush`.

8. **Verificar en el navegador** que `OnPush` no rompió la interactividad,
   que es donde suele notarse:

   | Comprobación | Resultado |
   |---|---|
   | Error de validación al perder el foco | «Introduce un correo válido.» |
   | El error desaparece al corregir | sí |
   | Filtros, búsqueda con espera y selección | funcionan |
   | Enlace al detalle (ahora cadena) | `/incidents/inc-003` |

   ```bash
   ng build                                          # sin errores
   ng test --watch=false --browsers=ChromeHeadless   # 434 SUCCESS
   ```

9. **Commit** con el mensaje sugerido por el reto:

   ```bash
   git commit -m "perf(ui): optimize rendering and change detection"
   ```

## 5. Resultado

| | Antes | Después |
|---|---|---|
| Componentes con `OnPush` | 6 de 19 | **19 de 19** |
| Llamadas de plantilla / 10 ciclos | **120** | **0** |
| Pruebas | 431 | 434 |

- Toda la aplicación en `OnPush`, sin un solo `markForCheck()`: el mérito es
  de haber puesto el estado en señales el Día 21.
- Los errores del formulario pasan de recalcularse doce veces por ciclo a
  cachearse hasta que algo cambia.
- Tres pruebas que impiden perder la optimización sin darse cuenta.
