# Día 4 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20. Complementa a
> [`../../PLAN.md`](../../PLAN.md).

## 1. Conceptos del día

### `@if` / `@else`

Sintaxis moderna de control de flujo en templates de Angular (reemplaza a
la directiva estructural `*ngIf`). Renderiza un bloque solo si la
condición es verdadera, con una rama alternativa opcional `@else`:

```html
@if (incident.assignedAgentId) {
  <span>Agente asignado: {{ incident.assignedAgentId }}</span>
} @else {
  <span>Sin agente asignado</span>
}
```

### `@for`

Reemplaza a `*ngFor` para iterar sobre una colección y repetir un bloque de
template por cada elemento:

```html
@for (incident of incidents(); track incident.id) { ... }
```

### `@empty`

Bloque hermano de `@for` que se renderiza automáticamente cuando la
colección iterada está vacía, sin necesidad de un `@if (length === 0)`
adicional:

```html
@for (incident of incidents(); track incident.id) {
  <!-- una tarjeta por incidencia -->
} @empty {
  <p>No hay incidencias registradas.</p>
}
```

### `@switch`

Reemplaza a la directiva `[ngSwitch]`/`*ngSwitchCase`. Evalúa una única
expresión y renderiza el bloque `@case` que coincide (o `@default` si
ninguno coincide), evitando encadenar múltiples `@if`/`@else if` para el
mismo valor:

```html
@switch (incident.status) {
  @case ('OPEN') { <span>Abierta</span> }
  @case ('IN_PROGRESS') { <span>En progreso</span> }
  @default { <span>Desconocido</span> }
}
```

### Variables de contexto

Dentro de un bloque `@for`, Angular expone variables implícitas del
contexto de iteración (`$index`, `$first`, `$last`, `$even`, `$odd`,
`$count`), además de la variable de la propia iteración (`incident`,
en nuestro caso). No las usamos todas en el listado de hoy, pero están
disponibles para casos como numerar filas o aplicar estilos alternos.

### Seguimiento de elementos con `track`

Obligatorio en `@for` (a diferencia del opcional `trackBy` de `*ngFor`).
Le indica a Angular cómo identificar de forma estable cada elemento entre
renders, para no destruir y recrear el DOM completo cuando la lista
cambia — solo actualiza lo que realmente cambió. Usamos `track
incident.id`, aprovechando que `Incident.id` es `readonly` y único (Día 2),
lo que lo vuelve un identificador **estable**: nunca cambia para una misma
incidencia entre renders, cumpliendo el criterio de aceptación "se utiliza
una expresión track estable".

## 2. Paso a paso — cómo lo hicimos

1. **Generar la página con Angular CLI**:

   ```bash
   ng generate component features/incidents/pages/incident-list
   ```

2. **Crear la lista local de incidencias simuladas**: en
   `incident-list.ts`, se reutilizaron los mocks tipados del Día 2
   (`MOCK_INCIDENTS`) como valor inicial de un `signal`, en vez de
   duplicar los datos:

   ```ts
   protected readonly incidents = signal<readonly Incident[]>(MOCK_INCIDENTS);
   ```

3. **Renderizar con `@for` y `track`** en `incident-list.html`, iterando
   sobre `incidents()` y usando `track incident.id`.

4. **Mostrar el estado vacío con `@empty`**, y agregar un botón
   `toggleIncidents()` (método en TypeScript, event binding en el
   template) que vacía o restaura la lista, para poder demostrar
   visualmente el bloque `@empty` sin depender de datos externos.

5. **Representar la prioridad y el estado con `@switch`**: un `@switch
   (incident.priority)` con un `@case` por cada valor de `IncidentPriority`
   para la etiqueta de prioridad, y un `@switch (incident.status)`
   (con `@default` de respaldo) para la etiqueta de estado — cada uno
   declarado una sola vez dentro del `@for`, sin repetir la lógica por
   incidencia.

6. **Mostrar información condicional con `@if`/`@else`**: si la incidencia
   tiene `assignedAgentId`, se muestra el agente asignado; si no, un texto
   "Sin agente asignado".

7. **Conectar la página al router**: se actualizó `app.routes.ts` para
   cargar `IncidentList` de forma diferida (`loadComponent`) en la ruta
   `incidents`, con `''` redirigiendo a `incidents`, de modo que
   `<router-outlet />` (ya presente desde el Día 3) muestre el listado.

8. **Verificar la compilación**: `ng build` sin errores, confirmando además
   que `incident-list` se genera como *lazy chunk* independiente.

9. **Verificar visualmente**: se sirvió la app con `npm start` y, sin
   herramienta de navegador interactiva disponible, se usó Chrome headless
   (`--dump-dom`) sobre `/incidents` para confirmar que se renderizan las 5
   incidencias con sus badges de prioridad/estado correctos y la
   información de agente asignado. Para comprobar el bloque `@empty`
   (que no se dispara con los clics simulados), se cambió temporalmente el
   valor inicial del signal a `[]`, se confirmó que aparecía el mensaje
   "No hay incidencias registradas." y el botón cambiaba a "Restaurar
   lista", y luego se revirtió el cambio a `MOCK_INCIDENTS`.

10. **Commit** con el mensaje sugerido por el propio reto:

    ```bash
    git commit -m "feat(incidents): render incidents using modern control flow"
    ```

## 3. Resultado

- Listado de incidencias completamente dinámico, sin lógica de negocio en
  el HTML (solo lectura de signals y llamadas a un método de toggle).
- Estado vacío implementado y verificado.
- Estados y prioridades representados sin duplicar condicionales por
  incidencia, usando exclusivamente control de flujo moderno (`@if`,
  `@for`, `@empty`, `@switch`) — sin `*ngIf`, `*ngFor` ni `ngSwitch`.
