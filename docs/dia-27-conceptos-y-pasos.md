# Día 27 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **carga diferida avanzada y experiencia de usuario.**

## 1. Conceptos del día

### `@defer`: aplazar lo que no es urgente

El Día 14 se difirieron **rutas** enteras con `loadChildren`. `@defer`
trabaja a un nivel más fino: difiere **una parte de una plantilla**.

```html
@defer (on idle) {
  <app-dashboard-stats />
} @placeholder (minimum 300ms) {
  …esqueleto…
} @loading (minimum 200ms) {
  <app-loading-indicator message="Cargando indicadores…" />
} @error {
  <p class="error-banner" role="alert">No se pudieron cargar los indicadores.</p>
}
```

Los cuatro bloques son cuatro momentos distintos:

| Bloque | Cuándo se ve |
|---|---|
| `@placeholder` | antes de empezar a cargar |
| `@loading` | mientras llega el fragmento |
| contenido | cuando está listo |
| `@error` | si el fragmento no llega |

### La condición: `on idle` frente a `on viewport`

Se usaron las dos, y por motivos distintos:

| Bloque diferido | Condición | Por qué |
|---|---|---|
| Indicadores del panel | `on idle` | están arriba del todo, así que `viewport` se cumpliría al instante; se espera a que el navegador esté ocioso |
| Actividad del detalle | `on viewport` | está al final de la página; si no se baja, no hace falta cargarla |

### La condición para que se divida el código

Un bloque `@defer` **solo genera un fragmento aparte si su contenido se usa
únicamente ahí**. Si el mismo componente aparece fuera del bloque, Angular
tiene que incluirlo en el paquete principal y el `@defer` deja de ahorrar
descarga (aunque siga retrasando el renderizado).

Por eso el día empezó **extrayendo dos componentes nuevos**:

- `DashboardStats`, que además de los tres contadores añade el desglose por
  estado con barras `<meter>` — algo con suficiente sustancia como para
  merecer diferirse.
- `IncidentActivity`, la traza de la incidencia.

Ninguno se usa fuera de su bloque. El listado conserva sus propios
contadores en línea: comparten aspecto por el sistema de diseño, no por
compartir componente.

### El marcador de posición evita el salto

El `@placeholder` no es decorativo: reserva **el mismo hueco** que ocupará el
contenido real.

```html
<ul class="stats" aria-hidden="true">
  <li class="stats-item stats-item--skeleton"></li>
  …
</ul>
```

Sin él, el contenido de debajo daría un salto al llegar los indicadores. Y
va con `aria-hidden="true"` porque es un hueco vacío: no aporta nada a quien
usa un lector de pantalla y solo añadiría ruido.

El `minimum 300ms` evita el efecto contrario: que el esqueleto aparezca y
desaparezca en un parpadeo, que molesta más que esperar.

## 2. La verificación (actividad 6) y lo que reveló

**La división del código sí ocurre.** El build lo confirma:

```
chunk-SWV7ZATV.js   | dashboard-stats    | 2.81 kB
chunk-G2RP6PHE.js   | incident-activity  | 2.43 kB
```

Dos fragmentos nuevos que antes no existían.

**Pero el estado transitorio no llega a verse.** Se intentó capturar el
marcador de posición en el navegador de cuatro formas: en desarrollo, con el
build de producción servido aparte, con la caché desactivada y con la red
limitada a 12 kB/s y 900 ms de latencia. En todas, el panel aparecía ya
renderizado a los 200 ms.

El motivo, comprobado registrando las peticiones: **Angular precarga los
fragmentos de los `@defer`**. Al entrar en la aplicación se descargan 20
fragmentos, y al abrir el panel no se pide **ninguno más**: ya estaba ahí.

Eso está bien para el usuario —el contenido aparece sin espera— pero
significa que en esta aplicación el `@placeholder` casi no se percibe. Con
fragmentos de 1 kB transferido, no hay ventana que mostrar.

Conviene decirlo tal cual y no fingir una captura del estado intermedio: los
cuatro estados **están implementados y probados**, pero el beneficio real
aquí es la división del paquete, no el ahorro de espera.

### Probar los estados sin poder verlos

Como el navegador no los muestra, se prueban con la API de pruebas de
Angular, que permite forzar cada estado:

```ts
const [block] = await fixture.getDeferBlocks();
await block.render(DeferBlockState.Loading);
```

Hay una prueba por estado: marcador de posición, carga, contenido y error.
Es más fiable que intentar pillar una ventana de milisegundos en el
navegador.

Un detalle útil: **por defecto, en las pruebas los bloques `@defer` se
quedan en el marcador de posición**. Eso rompió dos pruebas del panel que
buscaban los contadores, y con razón: esos contadores ya no están ahí al
primer render. Se movieron al spec del componente nuevo, y el del panel pasó
a probar lo que ahora le corresponde — el comportamiento del bloque
diferido.

## 3. Paso a paso — cómo lo hicimos

1. **Extraer `DashboardStats`**, con el desglose por estado y barras
   `<meter>` (que ya aportan rol y valor a un lector de pantalla).
2. **Extraer `IncidentActivity`**, que reconstruye la traza a partir de las
   marcas de tiempo del modelo.
3. **Diferir el panel** con `on idle` y los cuatro bloques.
4. **Diferir la actividad** con `on viewport`.
5. **Añadir el esqueleto** al sistema de diseño, con su animación y
   `prefers-reduced-motion` ya respetado desde el Día 6.
6. **Pruebas** (20 nuevas): 9 de `DashboardStats` —incluido que los
   porcentajes suman 100 y que sin incidencias no divide por cero—, 8 de
   `IncidentActivity` y 5 del bloque diferido con sus cuatro estados.
7. **Verificar la división** en el build y el comportamiento en el
   navegador.

   ```bash
   ng build                                          # sin errores
   ng test --watch=false --browsers=ChromeHeadless   # 454 SUCCESS
   ```

8. **Commit** con el mensaje sugerido por el reto:

   ```bash
   git commit -m "perf(loading): defer non critical incident dashboard content"
   ```

## 4. Resultado

| | Antes | Después |
|---|---|---|
| Fragmentos diferidos | 0 por `@defer` | **2** |
| Pruebas | 434 | **454** |

- Dos bloques diferidos con sus cuatro estados, cada uno con la condición
  que le corresponde.
- El panel gana un desglose por estado que antes no existía.
- Verificado con honestidad: la división existe; el estado transitorio, en
  esta aplicación, no llega a percibirse.
