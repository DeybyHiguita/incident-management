# Día 14 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **rutas hijas y carga diferida.**

## 1. Conceptos del día

### Rutas hijas y layout

Una ruta hija es una ruta que se muestra **dentro** de otra. La ruta padre
aporta un componente de marco —el *layout*— con su propio
`<router-outlet>`, y las hijas se renderizan ahí:

```
app.html                    → <router-outlet>  (nivel 1)
  incidents-layout.html     → <router-outlet>  (nivel 2)
    incident-list | incident-new | incident-detail | incident-edit
```

`IncidentsLayout` no pinta ninguna pantalla: aporta el encabezado de la
sección y el hueco donde entran las cuatro. Lo que sea común a toda la
funcionalidad se escribe una vez ahí, en lugar de repetirlo en cada página.

### Un archivo de rutas por funcionalidad

Las rutas de incidencias se mudaron de `app.routes.ts` a
[`features/incidents/incidents.routes.ts`](../src/app/features/incidents/incidents.routes.ts),
junto al código que enrutan. La raíz quedó así:

```ts
{
  path: 'incidents',
  loadChildren: () => import('./features/incidents/incidents.routes').then((m) => m.INCIDENT_ROUTES),
}
```

Dos ventajas concretas:

1. **La raíz no conoce las pantallas.** Añadir una vista de incidencias ya
   no obliga a tocar `app.routes.ts`. Hay una prueba que lo comprueba: la
   ruta `incidents` tiene `loadChildren` y **no** tiene `children`.
2. **Se puede diferir el bloque entero**, no pantalla a pantalla.

### `loadChildren` frente a `loadComponent`

| | Qué carga | Cuándo se usa |
|---|---|---|
| `loadComponent` | una pantalla | rutas sueltas |
| `loadChildren` | un archivo de rutas completo | una funcionalidad |

Los dos se combinan: `loadChildren` trae el mapa de rutas de incidencias, y
dentro cada hija sigue usando `loadComponent` para no arrastrar sus
hermanas.

### El orden, otra vez

Dentro de las hijas conviven tres rutas que empiezan igual:

```
'new'       ← antes que ':id', o el parámetro capturaría la palabra «new»
':id/edit'  ← antes que ':id', porque es más específica
':id'
```

Si `:id` fuera primero, `/incidents/inc-003/edit` no encontraría nada y
`/incidents/new` abriría el detalle de una incidencia inexistente. Hay una
prueba por cada caso.

### El beneficio de la carga diferida

Esta era la actividad 6, y se puede demostrar con datos en vez de
explicarlo. Estos son los fragmentos que genera la compilación:

```
incident-list    | 17.11 kB
incident-detail  |  4.25 kB
dashboard        |  3.36 kB
incident-edit    |  2.29 kB
not-found        |  1.61 kB
incident-new     |  1.41 kB
incidents-layout |   759 B
incidents-routes |   730 B
```

Y esto es lo que el navegador descarga **de verdad** al recorrer la
aplicación:

| Paso | Fragmentos nuevos |
|---|---|
| Abrir `/dashboard` | 6 |
| Ir a `/incidents` | 4 |
| Abrir un detalle | 1 |
| Ir a editar | 2 |

Los beneficios, en orden de importancia real:

1. **La primera pantalla llega antes.** Quien abre el panel no descarga los
   formularios reactivos, que son con diferencia lo más pesado de la
   aplicación. Y quien nunca entra a editar, nunca paga ese código.
2. **El coste crece por uso, no por tamaño del proyecto.** Añadir diez
   pantallas de incidencias no encarece la carga inicial: siguen detrás del
   mismo `loadChildren`.
3. **Los despliegues invalidan menos caché.** Al cambiar el formulario solo
   cambia el hash de su fragmento; el resto sigue cacheado en el navegador.
4. **La frontera es visible.** Si una pantalla de incidencias importara algo
   del panel, ese código saltaría al fragmento común y se notaría en el
   build. La carga diferida acaba funcionando como un control de
   arquitectura.

El coste, para ser justos: la primera visita a cada sección tiene una
petición extra. Es despreciable frente a descargarlo todo de entrada, y se
puede eliminar con estrategias de precarga.

## 2. Paso a paso — cómo lo hicimos

1. **Crear `IncidentsLayout`**, un componente con `<router-outlet>` y el
   encabezado de la sección.

2. **Crear `incidents.routes.ts`** con el layout como ruta padre y las
   cuatro hijas, cada una con su `loadComponent` y su `title`.

3. **Simplificar `app.routes.ts`**: la raíz pasa a tener cuatro entradas
   (`/dashboard`, `incidents` con `loadChildren`, la redirección y el
   comodín).

4. **Añadir `update()` al servicio** con un tipo `IncidentChanges`
   (`Partial` sin `id`, `createdAt` ni `updatedAt`). Igual que `create()`,
   el servicio decide lo que no le corresponde al formulario: aquí, refrescar
   `updatedAt` y blindar el identificador.

5. **Hacer que `IncidentForm` sirva para las dos pantallas**, con dos inputs
   nuevos: `initialValue` (si viene, es edición) y `submitLabel`.

   Aquí aparece el **primer `effect` del proyecto**, y conviene justificarlo
   después de lo que se documentó el Día 10:

   ```ts
   effect(() => {
     const value = this.initialValue();
     if (value) this.applyValue(value);
   });
   ```

   No sustituye a ningún `computed`: no produce un valor para la plantilla,
   sino que **sincroniza una señal con un `FormGroup`**, que es estado que
   vive fuera del sistema reactivo. Es exactamente el caso legítimo que
   describía aquel documento — la integración con algo que no entiende
   señales.

6. **Crear `IncidentEdit`**, que lee `:id`, arma el valor inicial, guarda con
   `update()` y vuelve al detalle. Añadido el enlace «Editar incidencia»
   desde la página de detalle.

7. **Pruebas** (19 nuevas): 8 de la página de edición, 7 de `update()` en el
   servicio y la reescritura del spec de rutas, que ahora recorre el árbol
   hasta la hoja para saber qué componente se activó de verdad.

8. **Verificar los fragmentos**: `ng build` los lista, y con el navegador
   automatizado se comprobó qué se descarga en cada navegación (la tabla de
   arriba).

   ```bash
   ng build                                          # sin errores
   ng test --watch=false --browsers=ChromeHeadless   # 231 SUCCESS
   ```

9. **Commit** con el mensaje sugerido por el reto:

   ```bash
   git commit -m "refactor(routing): lazy load incident feature routes"
   ```

## 3. Resultado

- Rutas de incidencias en su propio archivo, cargadas con `loadChildren`.
- Layout propio de la funcionalidad con `<router-outlet>` de segundo nivel.
- Cuatro rutas hijas, incluida la de edición, cada una en su fragmento.
- Formulario reutilizado para alta y edición sin duplicar validaciones.
- 231 pruebas en verde (212 anteriores + 19 nuevas).
