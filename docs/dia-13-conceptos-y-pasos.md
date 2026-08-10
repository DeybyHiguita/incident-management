# Día 13 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **enrutamiento básico.**

## 1. Conceptos del día

### El mapa de rutas

Una ruta asocia una dirección con un componente. El conjunto vive en
[`app.routes.ts`](../src/app/app.routes.ts):

| Ruta | Página | Para qué |
|---|---|---|
| `/dashboard` | `Dashboard` | resumen e indicadores |
| `/incidents` | `IncidentList` | listado con filtros |
| `/incidents/new` | `IncidentNew` | alta de incidencias |
| `/incidents/:id` | `IncidentDetail` | detalle de una |
| `**` | `NotFound` | cualquier otra dirección |

### El orden importa

Angular toma la **primera** ruta que coincide, no la más específica. De ahí
dos reglas que se ven en el archivo:

1. **`incidents/new` va antes que `incidents/:id`.** Si estuvieran al revés,
   `:id` capturaría la palabra «new» y la aplicación intentaría mostrar el
   detalle de una incidencia con ese identificador. Hay una prueba dedicada
   a esto, porque es un fallo fácil de introducir y difícil de ver.
2. **El comodín `**` va el último.** Colocado antes, se tragaría todo.

### Parámetros de ruta como inputs

La forma clásica de leer `:id` es inyectar `ActivatedRoute` y suscribirse a
sus parámetros. Con `withComponentInputBinding()` el parámetro llega
directamente como un input del componente:

```ts
// app.config.ts
provideRouter(routes, withComponentInputBinding())

// incident-detail.ts
readonly id = input.required<string>();
```

Es menos código, encaja con las signals del Día 10 y hace el componente
trivial de probar: en las pruebas basta con `setInput('id', 'inc-003')`, sin
simular el enrutador.

### Carga diferida (*lazy loading*)

Cada ruta usa `loadComponent` con un `import()` dinámico, así que la página
solo se descarga cuando se visita. El resultado se ve en el build:

```
incident-new    | 53.68 kB   ← incluye los formularios reactivos
incident-list   | 17.08 kB
incident-detail |  4.22 kB
dashboard       |  3.32 kB
not-found       |  1.58 kB
```

Quien solo abre el panel no descarga el módulo de formularios, que es con
diferencia el más pesado.

### Navegación declarativa vs. programática

Son dos formas distintas y cada una tiene su sitio:

| | Declarativa | Programática |
|---|---|---|
| Cómo | `routerLink` en un `<a>` | `router.navigate([...])` |
| Cuándo | el usuario decide ir | consecuencia de una acción |
| Ejemplo | «Ver detalle», el menú | tras registrar una incidencia |

La declarativa se prefiere siempre que se pueda, porque genera un enlace
real: se puede abrir en otra pestaña, copiar la dirección o recorrer con el
teclado. La programática es para cuando el destino depende del resultado:

```ts
const created = this.incidentService.create({ … });
this.router.navigate(['/incidents', created.id]);
```

Aquí no se puede usar un enlace porque el id no existe hasta que el servicio
lo crea.

### La opción activa del menú

`routerLinkActive` añade una clase cuando la ruta está activa. El detalle
está en cómo decide qué es «activa»: por defecto, una ruta coincide si es
**prefijo** de la actual, así que estando en `/incidents/new` se marcarían
«Incidencias» **y** «Nueva» a la vez. Se corrige con:

```html
[routerLinkActiveOptions]="{ exact: true }"
```

Y para que el estado no sea solo visual, `ariaCurrentWhenActive="page"`
añade `aria-current="page"`, que es lo que anuncia un lector de pantalla.

### La página 404 y el recurso que no existe

Son dos casos distintos que conviene no mezclar:

- **`/pagina/inventada`** → no hay ninguna ruta así. Lo atiende el comodín
  `**` con la página `NotFound`.
- **`/incidents/inc-999`** → la ruta **sí** existe y es válida; lo que no
  existe es esa incidencia. Lo resuelve la propia página de detalle
  mostrando «Incidencia no encontrada», sin salir de su ruta.

En ambos casos la dirección escrita **se conserva**: no se redirige. Así el
usuario ve qué escribió mal y puede corregirlo.

## 2. Paso a paso — cómo lo hicimos

1. **Crear las cuatro páginas** con el CLI: `dashboard`, `incident-new`,
   `incident-detail` y `not-found`.

2. **Reescribir `app.routes.ts`** con las cinco rutas, todas con
   `loadComponent` y con su `title`, que es lo que cambia el título del
   navegador al navegar.

3. **Activar `withComponentInputBinding()`** en `app.config.ts` para recibir
   `:id` como input.

4. **Mover el formulario del listado a su propia página.** Desde el Día 11
   vivía dentro de `IncidentList`; ahora `IncidentNew` lo aloja, lo conecta
   con el servicio y navega al detalle de lo recién creado.

5. **Enlazar el listado con el detalle** sin acoplar la tarjeta al
   enrutador: `IncidentCard` recibe un input `detailLink` con la ruta ya
   construida por el contenedor.

   ```html
   <app-incident-card [detailLink]="['/incidents', incident.id]" … />
   ```

   La tarjeta sigue sin saber qué direcciones tiene la aplicación, así que
   se puede seguir reutilizando en cualquier parte (Día 5).

6. **Ampliar el menú** a tres entradas con `routerLinkActive`, `exact` en
   «Incidencias» y `ariaCurrentWhenActive`.

7. **Mover los estilos `.stats` al `styles.scss` global.** Estaban dentro de
   `incident-list.scss` y el panel no los habría heredado: los estilos de
   componente están encapsulados. Es la misma lección del Día 10.

8. **Pruebas** (28 nuevas): las cuatro páginas más un
   [`app.routes.spec.ts`](../src/app/app.routes.spec.ts) que **navega de
   verdad** —resolviendo los `loadComponent`— y comprueba la redirección de
   la raíz, que «new» no lo capture `:id`, que el comodín atienda lo
   desconocido y que todas las rutas declaren título y carga diferida.

9. **Evidencia en el navegador real**, recorriendo la aplicación entera:

   | Paso | URL resultante | Título | Menú activo |
   |---|---|---|---|
   | Raíz | `/dashboard` | Panel de control | Panel |
   | Listado | `/incidents` | Incidencias | Incidencias |
   | Clic en «Ver detalle» | `/incidents/inc-001` | Detalle de incidencia | — |
   | Alta | `/incidents/new` | Nueva incidencia | Nueva |
   | **Tras registrar** | `/incidents/inc-006` | Detalle de incidencia | — |
   | Id inexistente | `/incidents/inc-999` | «Incidencia no encontrada» | — |
   | Ruta desconocida | `/pagina/inventada` | Página no encontrada | — |

   Capturas en [`img/dia-13-dashboard.png`](img/dia-13-dashboard.png),
   [`img/dia-13-detalle.png`](img/dia-13-detalle.png) y
   [`img/dia-13-404.png`](img/dia-13-404.png).

10. **Verificar**:

    ```bash
    ng build                                          # sin errores
    ng test --watch=false --browsers=ChromeHeadless   # 212 SUCCESS
    ```

11. **Commit** con el mensaje sugerido por el reto:

    ```bash
    git commit -m "feat(routing): configure incident application routes"
    ```

## 3. Entregable del día

| Entregable | Dónde está |
|---|---|
| Navegación funcional | cinco rutas, menú con la opción activa marcada, y las dos formas de navegar (enlace y programática) |
| Página de detalle inicial | `IncidentDetail`, con los datos de la incidencia, los nombres de usuario resueltos y su caso de «no encontrada» |
| Página 404 | `NotFound` en la ruta comodín, conservando la dirección escrita |

## 4. Resultado

- Aplicación de cinco rutas, todas diferidas: quien abre el panel no
  descarga los formularios.
- El detalle recibe su `:id` como input, sin `ActivatedRoute` ni
  suscripciones.
- Distinción clara entre «esta dirección no existe» (404) y «esta incidencia
  no existe» (detalle vacío).
- 212 pruebas en verde (184 anteriores + 28 nuevas).
