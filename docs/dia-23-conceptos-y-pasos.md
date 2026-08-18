# Día 23 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **componentes reutilizables y proyección de contenido.**

## 1. Conceptos del día

### Proyección de contenido

`<ng-content>` es un hueco donde Angular coloca lo que le pasen desde fuera.
Es lo que distingue un componente **reutilizable** de uno que solo sirve
para un caso.

Con inputs, el componente decide qué se puede personalizar y de qué tipo.
Con proyección, **quien lo usa mete lo que quiera**: texto, un botón, otro
componente. El modal no sabe qué contiene, y por eso vale para cualquier
contenido.

El modal tiene tres huecos:

```html
<ng-content select="[modalTitle]" />   <!-- solo lo marcado con modalTitle -->
<ng-content />                          <!-- todo lo demás -->
<ng-content select="[modalActions]" />  <!-- solo lo marcado con modalActions -->
```

Y se usa así:

```html
<app-modal [open]="…">
  <span modalTitle>Eliminar incidencia</span>
  <p>¿Seguro que quieres continuar?</p>
  <button modalActions>Aceptar</button>
</app-modal>
```

El `<ng-content>` **sin** `select` es el cajón de sastre: recoge lo que no
haya encajado en ningún selector. Por eso conviene declararlo, o el
contenido suelto desaparece sin avisar.

### Apoyarse en la plataforma: `<dialog>`

`Modal` no recrea una ventana con `<div>`: usa el elemento nativo
`<dialog>` con `showModal()`. Lo que se obtiene sin programar nada:

- el foco queda **atrapado** dentro;
- `Escape` la cierra;
- el fondo queda inerte, sin poder tabular hacia él;
- el navegador **restaura el foco** al elemento que la abrió.

Cada una de esas cuatro cosas es un error de accesibilidad común en modales
hechos a mano. La regla, ya vista el Día 6 con los botones: si la plataforma
lo hace, no lo reimplementes.

### Componer en vez de repetir

`ConfirmDialog` no reimplementa el modal: **lo usa**.

```html
<app-modal [open]="open()" (closed)="onCancel()">
  <span modalTitle>{{ title() }}</span>
  …
</app-modal>
```

Así, cualquier arreglo en el modal —una mejora de accesibilidad, un cambio
de estilo— llega también a la confirmación. Hay una prueba que fija esa
relación: comprueba que el diálogo de confirmación renderiza un `<dialog>`.

### El estado sigue fuera

Ninguno de los cuatro componentes guarda estado propio: el modal recibe
`open` y avisa con `closed`; la confirmación avisa con `confirmed` o
`cancelled`. Es la misma división del Día 5 — el hijo informa, el padre
decide.

En el listado, eso se traduce en guardar **la incidencia entera** pendiente
de borrar, y no un simple booleano:

```ts
protected readonly pendingDeletion = signal<Incident | null>(null);
```

Con un booleano el diálogo diría «¿seguro?»; con la incidencia dice
«¿seguro que quieres eliminar *Impresora de red desconectada*?», que es lo
que evita borrar la que no era.

### Reemplazar las duplicaciones

Los cuatro componentes no se crearon por gusto: cada uno sustituye código
repetido.

| Componente | Qué se repetía | Dónde |
|---|---|---|
| `LoadingIndicator` | girador + texto + `role="status"` | listado, alta, edición |
| `EmptyState` | borde discontinuo + centrado + color | listado, panel |
| `Modal` | — (no había ninguno) | — |
| `ConfirmDialog` | — | — |

El beneficio no es escribir menos, es que **las tres pantallas se anuncian
igual** a un lector de pantalla, y seguirán haciéndolo cuando alguien
cambie el componente.

De paso, la eliminación pasó a pedir confirmación. Antes bastaba un clic
para borrar sin vuelta atrás.

## 2. Tres tropiezos con las pruebas (y lo que enseñan)

Este día dio más guerra en las pruebas que en el código.

### 2.1 El navegador se desconectaba

La batería empezó a morir a mitad con `DISCONNECTED`, en un punto distinto
cada vez. Parecía cosa de `showModal()` atrapando el foco.

No lo era. La causa estaba en un ayudante de prueba:

```ts
findIn(fixture.nativeElement, 'Eliminar')   // ← encontraba el de la tarjeta
```

El ayudante busca por **prefijo** del nombre accesible, y el botón de cada
tarjeta se llama «Eliminar incidencia», que también empieza por «Eliminar».
Así que nunca pulsaba el del diálogo, la incidencia no se borraba y este
bucle no terminaba jamás:

```ts
while (cards().length > 0) { deleteIncident(cards()[0]); }
```

El arreglo fue acotar la búsqueda al `<dialog>`. La lección: **un test que
cuelga suele ser un bucle que no avanza**, no un problema del entorno. Y los
ayudantes que buscan por prefijo son cómodos hasta que dos textos comparten
principio.

### 2.2 Esperar un temporizador no es esperar un evento

Los tests de cierre fallaban de forma intermitente:

```ts
dialog().close();
await new Promise((r) => setTimeout(r, 0));   // ← frágil
expect(host.closedTimes).toBe(1);
```

El evento `close` del `<dialog>` lo encola **el navegador**, y un
`setTimeout(0)` encola otra tarea. El orden entre ambas no está garantizado:
a veces el temporizador ganaba y la comprobación llegaba antes que el
evento.

La solución es esperar **al evento en sí**:

```ts
const closed = whenClosed();   // se registra ANTES de cerrar
dialog().close();
await closed;
```

### 2.3 `fakeAsync` tampoco servía aquí

Antes de eso se intentó con `fakeAsync` y `tick()`, sin éxito: ese evento no
pasa por Zone.js, así que `tick()` no puede adelantarlo. Es el mismo límite
del Día 19 con los `import()` diferidos, y ya van dos veces:

> `fakeAsync` controla el tiempo **de Zone.js**. Lo que encola el navegador
> por su cuenta necesita espera real.

Se comprobó midiéndolo en un navegador de verdad antes de tocar nada, en
lugar de ir probando a ciegas.

## 3. Paso a paso — cómo lo hicimos

1. **Crear los cuatro componentes** en `shared/components/`.
2. **Modal** con `<dialog>` nativo, tres ranuras de proyección, cierre por
   botón, por `Escape` y por clic en el fondo.
3. **ConfirmDialog** componiendo el modal, con variante destructiva.
4. **EmptyState** y **LoadingIndicator**, con ranura y mensaje configurable.
5. **Sustituir las duplicaciones** en listado, alta, edición y panel.
6. **Añadir la confirmación al eliminar**, nombrando la incidencia.
7. **Pruebas** (27 nuevas): las tres ranuras de proyección, las tres formas
   de cerrar, que la confirmación se apoya en el modal, que cerrar equivale
   a cancelar y que el estado vacío no deja rastro de lo que no se le pasa.
8. **Verificar**:

   ```bash
   ng build                                          # sin errores
   ng test --watch=false --browsers=ChromeHeadless   # 410 SUCCESS
   ```

9. **Commit** con el mensaje sugerido por el reto:

   ```bash
   git commit -m "feat(shared): build reusable modal loading and empty state components"
   ```

## 4. Resultado

- Cuatro componentes reutilizables, tres de ellos sustituyendo código que
  estaba copiado.
- Un modal accesible apoyado en la plataforma en lugar de reinventarla.
- Eliminar ya no es irreversible de un clic.
- 410 pruebas en verde (383 anteriores + 27 nuevas).
