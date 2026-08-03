# Día 5 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **implementar comunicación entre componentes padre e hijo.**

## 1. Conceptos del día

### Inputs

Un *input* es la puerta de entrada de datos **del padre hacia el hijo**. El
padre pasa un valor con property binding y el hijo lo recibe como una señal
de solo lectura. En Angular 20 se declaran con la función `input()` (en vez
del decorador `@Input()`), lo que los convierte en *signals*: se leen
llamándolos como función y son reactivos.

```ts
// hijo: incident-card.ts
readonly selected = input(false); // opcional, con valor por defecto
```

```html
<!-- padre: incident-list.html -->
<app-incident-card [selected]="incident.id === selectedId()" />
```

Un input **no se asigna desde el hijo**: es de solo lectura. Si el hijo
intentara `this.incident.set(...)`, no compilaría — la señal de un input no
expone `set` ni `update`.

### Inputs requeridos

`input.required<T>()` declara un input **sin valor por defecto y
obligatorio**: si el padre no lo pasa, Angular lanza un error en tiempo de
ejecución al crear el componente, y el compilador de plantillas lo marca
como error si puede detectarlo estáticamente.

```ts
readonly incident = input.required<Incident>();
```

Se usa cuando el componente no tiene sentido sin ese dato: una
`IncidentCard` sin incidencia no representa nada. La ventaja frente a
`input<Incident | undefined>(undefined)` es que el tipo dentro del
componente es `Incident` limpio, sin `undefined`, así que no hay que
comprobarlo en cada uso.

> Detalle práctico visible en las pruebas: como el input es requerido, hay
> que asignarlo con `fixture.componentRef.setInput('incident', ...)` **antes**
> del primer `detectChanges()`, o el test falla.

### Outputs

Un *output* es la puerta de salida **del hijo hacia el padre**: un canal por
el que el hijo notifica que algo ocurrió. Se declara con `output<T>()` (en
vez de `@Output() ... = new EventEmitter<T>()`), donde `T` es el tipo del
dato que viaja en el evento.

```ts
readonly incidentSelected = output<Incident>();
readonly deleteRequested = output<Incident>();
```

El padre lo escucha como si fuera un evento del DOM, y accede al dato
emitido con la variable `$event`:

```html
<app-incident-card (deleteRequested)="onDeleteRequested($event)" />
```

Nombrar los outputs en **pasado o como solicitud** (`incidentSelected`,
`deleteRequested`) y no como orden (`delete`) es intencional: refuerza que
el hijo *informa* de una intención del usuario, y es el padre quien decide
qué hacer con ella.

### Emisión de eventos

Emitir es disparar el output con un dato concreto: `output.emit(valor)`. En
nuestra tarjeta, el clic del usuario se traduce en una emisión, sin ninguna
otra lógica:

```ts
protected onDelete(): void {
  this.deleteRequested.emit(this.incident());
}
```

Fíjate en lo que **no** hace ese método: no borra nada, no toca la lista, no
sabe siquiera que existe una lista. Solo levanta la mano. Lo mismo con la
selección: el hijo no guarda "estoy seleccionado", solo emite; quien decide
si queda seleccionada es el padre, que devuelve el resultado por el input
`selected`. Ese viaje de ida y vuelta (input ↓ / output ↑) es el patrón de
flujo de datos unidireccional de Angular.

### Separación entre componentes contenedores y de presentación

Es un patrón de arquitectura que divide los componentes en dos roles:

| | Contenedor (*smart*) | Presentación (*dumb*) |
|---|---|---|
| Ejemplo | `IncidentList` | `IncidentCard` |
| Qué hace | posee el estado y decide | dibuja lo que le pasan |
| Datos | dueño de la colección | recibe por inputs |
| Acciones | ejecuta los cambios | emite eventos |
| Reutilizable | poco (atado al caso de uso) | mucho |
| Testeable | con estado | con inputs/outputs, sin dependencias |

En el Día 4 la tarjeta era markup suelto dentro del `@for` del listado. Hoy
se extrajo a un componente propio, y con eso `IncidentCard` puede aparecer
en cualquier otro listado (resultados de búsqueda, dashboard, incidencias de
un usuario) sin arrastrar la lógica del listado actual.

### Inmutabilidad de datos

Inmutabilidad es **no modificar** una estructura existente, sino producir
una nueva con el cambio aplicado. Al eliminar una incidencia no hacemos
`splice` sobre el arreglo: creamos uno nuevo con `filter`.

```ts
protected onDeleteRequested(incident: Incident): void {
  this.incidents.update((current) => current.filter((item) => item.id !== incident.id));
}
```

Por qué importa aquí:

1. **Las signals detectan el cambio por identidad de referencia.** Si
   mutáramos el arreglo, la referencia sería la misma y la señal no
   notificaría a nadie: la vista no se actualizaría.
2. **Permite `ChangeDetectionStrategy.OnPush` en el hijo** (que activamos en
   `IncidentCard`): con datos inmutables, comparar referencias basta para
   saber si hay que volver a renderizar.
3. **El estado es predecible.** Nadie puede cambiar una incidencia "por la
   espalda" desde otro punto de la app.

Se refuerza además con el tipado del Día 2: la colección está declarada como
`readonly Incident[]` e `Incident.id` es `readonly`, así que el propio
TypeScript rechaza los intentos de mutación.

## 2. Paso a paso — cómo lo hicimos

1. **Generar el componente hijo** con Angular CLI, dentro de una carpeta
   `components/` (no `pages/`, porque no es una ruta sino una pieza
   reutilizable):

   ```bash
   ng generate component features/incidents/components/incident-card
   ```

2. **Mover la tarjeta del Día 4 al hijo**: el `<article class="incident-card">`
   con sus `@switch` de prioridad y estado, y su `@if`/`@else` de agente
   asignado, pasó de `incident-list.html` a `incident-card.html`. Los estilos
   de la tarjeta y de los badges se movieron igualmente a
   `incident-card.scss`, dejando en `incident-list.scss` solo lo del listado.

3. **Declarar el contrato del hijo** en
   [`incident-card.ts`](../src/app/features/incidents/components/incident-card/incident-card.ts):

   ```ts
   readonly incident = input.required<Incident>();   // requerido
   readonly selected = input(false);                 // opcional
   readonly incidentSelected = output<Incident>();
   readonly deleteRequested = output<Incident>();
   ```

   Y se activó `ChangeDetectionStrategy.OnPush`, coherente con que todos sus
   datos llegan por inputs inmutables.

4. **Agregar las acciones del usuario** en el template del hijo: dos botones
   ("Seleccionar" / "Eliminar") cuyos handlers solo emiten el output
   correspondiente con la incidencia recibida.

5. **Convertir el listado en contenedor** en
   [`incident-list.ts`](../src/app/features/incidents/pages/incident-list/incident-list.ts):
   mantiene la colección en un signal y agrega `selectedId` como signal
   aparte. Se guarda el **id** y no el objeto, para que la selección no
   apunte a una incidencia ya eliminada; `selectedIncident` es un `computed`
   que la resuelve contra la colección actual, así que al borrar la
   seleccionada la selección se limpia sola.

6. **Conectar padre e hijo** en `incident-list.html`, dentro del mismo `@for`
   del Día 4:

   ```html
   <app-incident-card
     [incident]="incident"
     [selected]="incident.id === selectedId()"
     (incidentSelected)="onIncidentSelected($event)"
     (deleteRequested)="onDeleteRequested($event)"
   />
   ```

7. **Implementar los handlers en el padre**: la selección alterna el
   `selectedId` (volver a hacer clic en la seleccionada la deselecciona) y
   la eliminación filtra la colección creando un arreglo nuevo. Se reemplazó
   el botón de "vaciar/restaurar" del Día 4 por un "Restaurar lista" que se
   deshabilita cuando no hay nada que restaurar: ahora la lista se vacía
   eliminando de verdad, no simulando.

8. **Pruebas**: se escribieron specs para el hijo (emite la incidencia
   recibida al seleccionar y al eliminar, sin modificarla) y para el
   contenedor (renderiza una tarjeta por incidencia, marca la seleccionada,
   elimina, no muta `MOCK_INCIDENTS`, muestra el estado vacío y restaura).

   ```bash
   ng test --watch=false --browsers=ChromeHeadless   # 14 SUCCESS
   ```

9. **Verificación de compilación y render**: `ng build` sin errores, y con
   Chrome headless (`--dump-dom`) sobre `/incidents` se confirmó que se
   renderizan 5 `<app-incident-card>` con sus 5 botones "Seleccionar" y 5
   "Eliminar", más el texto inicial "Ninguna incidencia seleccionada".

10. **Commit** con el mensaje sugerido por el reto:

    ```bash
    git commit -m "feat(incidents): implement parent-child component communication"
    ```

## 3. Criterios de aceptación del día

| Criterio | Cómo se cumple |
|---|---|
| El componente hijo no modifica el input | `incident` es `input.required()` (señal de solo lectura); los handlers solo llaman a `emit()`. Cubierto por el test "emite la incidencia recibida al pedir eliminarla, sin modificarla". |
| Los eventos tienen tipos definidos | `output<Incident>()` en ambos outputs; `$event` llega tipado como `Incident` al padre. |
| La tarjeta puede reutilizarse en diferentes listados | `IncidentCard` es standalone, sin dependencias del listado ni de los mocks: solo necesita que le pasen un `Incident`. |
| El componente contenedor administra la colección | `IncidentList` es dueño del signal `incidents` y el único que lo modifica, siempre de forma inmutable (`filter`, `set`). |

## 4. Resultado

- Comunicación padre→hijo por inputs (uno requerido, uno opcional) y
  hijo→padre por outputs tipados.
- Estado (colección y selección) concentrado en el contenedor; la tarjeta es
  puramente presentacional y reutilizable.
- Eliminación y selección funcionando sin mutar datos, verificadas con 14
  pruebas unitarias en verde.
