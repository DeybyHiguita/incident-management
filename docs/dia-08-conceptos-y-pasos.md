# Día 8 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **crear comportamientos reutilizables mediante
> directivas.**

## 1. Conceptos del día

### Directivas de atributo

Una directiva de atributo **añade comportamiento a un elemento que ya
existe**, sin aportar plantilla propia. Es la diferencia con un componente:

| | Componente | Directiva de atributo |
|---|---|---|
| Selector | etiqueta (`<app-incident-card>`) | atributo (`[appFocusWithin]`) |
| Plantilla | sí, dibuja HTML | no, decora lo que ya hay |
| Cuántas por elemento | una | varias a la vez |
| Ejemplo del proyecto | `IncidentCard` | `IncidentHighlight`, `FocusWithin` |

Que se puedan combinar es justo lo que hacemos en la tarjeta: el mismo
`<article>` lleva las dos directivas y sus propias clases, cada una
ocupándose de una cosa.

```html
<article
  class="incident-card"
  [appIncidentHighlight]="incident().priority"
  appFocusWithin
>
```

Hoy creamos dos, en `shared/directives/`:

| Directiva | Responsabilidad única |
|---|---|
| [`IncidentHighlight`](../src/app/shared/directives/incident-highlight.ts) | resaltar el elemento si la incidencia es crítica |
| [`FocusWithin`](../src/app/shared/directives/focus-within.ts) | marcar el elemento mientras el foco esté dentro |

### Host bindings

El *host* es el elemento sobre el que está puesta la directiva. Un **host
binding** enlaza una propiedad, clase o atributo de ese elemento con el
estado de la directiva, de forma declarativa: se describe *qué* debe pasar y
Angular se encarga de sincronizarlo.

```ts
@Directive({
  selector: '[appIncidentHighlight]',
  host: {
    '[class.is-critical]': 'isCritical()',
    '[attr.data-priority]': 'priority()',
    '[attr.aria-current]': 'isCritical() ? "true" : null',
  },
})
```

Cuando `isCritical()` pasa a `false`, Angular **quita** la clase solo. No
hay que acordarse de deshacer nada, que es la fuente habitual de errores al
manipular el DOM a mano.

> Nota de versión: existe también el decorador `@HostBinding('class.x')`
> sobre una propiedad. Hoy la guía de Angular recomienda la propiedad `host`
> del decorador, que además encaja mejor con signals; es la que usamos.

Un detalle de accesibilidad: `aria-current` se pone a `null` —y no a
`"false"`— cuando la incidencia no es crítica. Un atributo con valor `null`
Angular lo elimina del DOM, mientras que `aria-current="false"` seguiría
presente y los lectores de pantalla podrían anunciarlo.

### Host listeners

El equivalente para eventos: la directiva escucha eventos del elemento
anfitrión y reacciona.

```ts
host: {
  '(focusin)': 'onFocusIn()',
  '(focusout)': 'onFocusOut($event)',
}
```

Elegimos `focusin`/`focusout` en lugar de `focus`/`blur` por una razón
concreta: **los primeros se propagan** desde los descendientes hasta el
host, y los segundos no. Como queremos saber si el foco está en *cualquier*
botón dentro de la tarjeta, necesitamos los que burbujean.

Al usar los eventos nativos de foco, el comportamiento **funciona con
teclado por construcción**: `focusin` es lo que dispara el navegador al
tabular, sin depender del ratón.

### Inyección de dependencias

Angular construye las directivas y les entrega lo que pidan. Con la función
`inject()`, `FocusWithin` recibe una referencia a su elemento anfitrión:

```ts
private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
```

No se inyecta "porque sí": hace falta para resolver un problema real. Al
tabular del primer botón de la tarjeta al segundo, el navegador dispara un
`focusout` aunque el foco siga dentro. Sin comprobarlo, la marca visual
parpadearía en cada salto:

```ts
const stillInside = nextTarget instanceof Node && this.host.nativeElement.contains(nextTarget);
```

### Manipulación segura del elemento

La regla que seguimos: **el DOM se lee, no se escribe.**

- ✅ `nativeElement.contains(...)` — una consulta de solo lectura.
- ❌ `nativeElement.style.backgroundColor = 'red'` — escritura directa.
- ❌ `nativeElement.classList.add('is-critical')` — escritura directa.

Quien escribe en el DOM es siempre Angular, a través de los host bindings.
Por qué importa:

1. **Reversibilidad**: Angular sabe qué puso y lo quita cuando toca.
2. **Portabilidad**: el código no asume que existe un DOM de navegador, lo
   que lo mantiene compatible con renderizado en servidor.
3. **Seguridad**: se evita inyectar HTML o estilos sin pasar por el
   saneamiento de Angular.

Si en algún momento hiciera falta escribir de verdad, la vía correcta no es
`nativeElement` sino `Renderer2`, que abstrae la plataforma. En estas dos
directivas no hizo falta: los host bindings cubren todo el caso.

### Reutilización de comportamiento

La prueba de fuego de una directiva es poder aplicarla donde no fue pensada.
Cada una se usa hoy en **dos componentes distintos**:

| Directiva | Usos |
|---|---|
| `IncidentHighlight` | el `<article>` de `IncidentCard` y el `<p>` del panel de selección de `IncidentList` |
| `FocusWithin` | el `<article>` de `IncidentCard` y el bloque de usuario de `Header` |

Ninguna importa nada de esos componentes: `IncidentHighlight` solo conoce el
tipo `IncidentPriority`, y `FocusWithin` no conoce nada del dominio — podría
irse tal cual a otro proyecto.

Compárese con la alternativa: si el resaltado viviera dentro de
`IncidentCard`, el panel de selección tendría que duplicar la condición
`priority === 'CRITICAL'` y su estilo. Con la directiva, la regla de "qué es
crítico" está escrita **una sola vez**.

Una consecuencia práctica del reparto: **la directiva aporta el
comportamiento (cuándo) y el sistema de diseño la apariencia (cómo)**. Por
eso `.is-critical` y `.has-focus-within` se definieron en el `styles.scss`
global del Día 6, y no dentro de un componente: los estilos de componente
están encapsulados y no alcanzarían a un elemento de otro.

## 2. Paso a paso — cómo lo hicimos

1. **Generar las directivas** con Angular CLI:

   ```bash
   ng generate directive shared/directives/incident-highlight
   ng generate directive shared/directives/focus-within
   ```

2. **Implementar `IncidentHighlight`**: un `input.required` con `alias`
   igual al selector —lo que permite escribir
   `[appIncidentHighlight]="incident.priority"` sin repetir el atributo— y
   un `computed` que decide si la prioridad es crítica. Todo lo demás son
   host bindings.

3. **Implementar `FocusWithin`**: un `signal` privado con el estado, dos
   host listeners para `focusin`/`focusout` y un host binding para la clase.
   El estado se expone como señal de solo lectura con `asReadonly()`, de
   modo que nadie de fuera pueda escribirlo.

4. **Aplicar cada directiva en dos componentes distintos**, para verificar
   en el propio código que no dependen de ninguno (tarjeta + listado, y
   tarjeta + cabecera).

5. **Definir las clases en el sistema de diseño global** (`styles.scss`),
   usando las variables del Día 6 (`--color-danger`, `--shadow-md`,
   `--color-focus`).

6. **Escribir las pruebas** con un **componente anfitrión de prueba**. Es el
   punto donde el esqueleto que genera el CLI no sirve: hacía
   `new IncidentHighlight()`, y eso falla porque una directiva necesita un
   contexto de inyección y un elemento real sobre el que actuar. La forma
   correcta es declarar un componente mínimo que la use:

   ```ts
   @Component({
     imports: [IncidentHighlight],
     template: `<article [appIncidentHighlight]="priority()">…</article>`,
   })
   class HostComponent { readonly priority = signal('LOW'); }
   ```

   En el caso de `FocusWithin`, las pruebas llaman a `.focus()` real sobre
   los botones —exactamente lo que hace el navegador al tabular— en vez de
   fabricar eventos sintéticos, así que validan de verdad el recorrido con
   teclado.

7. **Verificar**:

   ```bash
   ng build                                          # sin errores
   ng test --watch=false --browsers=ChromeHeadless   # 72 SUCCESS
   ```

   Y sobre la app servida, con Chrome headless, se confirmó en el DOM real
   que las 5 tarjetas llevan su `data-priority`, que **solo** la incidencia
   crítica (`inc-003`) recibe `is-critical` y `aria-current="true"`, y que
   `has-focus-within` no aparece hasta que el foco entra.

8. **Commit** con el mensaje sugerido por el reto:

   ```bash
   git commit -m "feat(shared): create reusable incident highlight directive"
   ```

## 3. Criterios de aceptación del día

| Criterio | Cómo se cumple |
|---|---|
| La directiva tiene una única responsabilidad | `IncidentHighlight` solo decide si algo es crítico; `FocusWithin` solo sigue el foco. Ninguna sabe de la otra ni comparte estado. |
| La directiva no depende de un componente específico | Viven en `shared/directives/` y no importan ningún componente. Cada una se aplica hoy en dos componentes distintos, y las pruebas la ponen sobre `<article>`, `<p>` y `<div>` con el mismo resultado. |
| El comportamiento funciona con teclado | `FocusWithin` escucha `focusin`/`focusout`, los eventos que dispara el navegador al tabular. Cuatro pruebas usan `.focus()` real, incluida la de tabular entre dos hijos sin que la marca parpadee. |
| La prueba valida el efecto principal | 14 pruebas nuevas: que la crítica se resalta, que las demás no, que el resaltado se **quita** al dejar de ser crítica, que tolera valores nulos o desconocidos, y el ciclo completo de entrada y salida del foco. |

## 4. Resultado

- Dos directivas de atributo reutilizables, sin dependencias de ningún
  componente, aplicadas cada una en dos lugares distintos.
- Cero manipulación directa del DOM: solo host bindings y una lectura
  (`contains`) justificada.
- 72 pruebas en verde (58 anteriores + 14 nuevas).
