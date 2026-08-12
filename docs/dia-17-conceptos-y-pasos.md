# Día 17 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **manejo de suscripciones y ciclo de vida.**

## 1. La auditoría: qué había

Antes de tocar nada, se buscaron todas las suscripciones del proyecto:

```bash
grep -rn "\.subscribe(" src/app --include="*.ts" | grep -v ".spec.ts"
```

| Dónde | Qué hace | ¿Riesgo? | Decisión |
|---|---|---|---|
| `IncidentService.load()` | carga inicial | No | se deja como está |
| `IncidentNew.onSubmitted()` | crea y **navega** | Sí | `takeUntilDestroyed` |
| `IncidentEdit.onSubmitted()` | actualiza y **navega** | Sí | `takeUntilDestroyed` |
| `IncidentList.onDeleteRequested()` | elimina | Leve | `takeUntilDestroyed` |

Y de hooks de ciclo de vida: **ninguno**. Ni un `ngOnInit` ni un
`ngOnDestroy` en todo el proyecto, lo cual, lejos de ser un descuido, es
consecuencia de decisiones anteriores (inputs como señales, `computed`,
`toSignal`).

### Por qué el servicio no necesita nada

Dos razones, y conviene distinguirlas:

1. **Las peticiones de `HttpClient` se completan solas.** Un Observable que
   completa libera su suscripción; no queda nada colgando. Esto vale para
   las cuatro.
2. **`IncidentService` es `providedIn: 'root'`**: vive lo que vive la
   aplicación, así que no hay «destrucción» de la que protegerse.

### Cuál era el riesgo de verdad

Aquí está el matiz importante del día: en las suscripciones de los
componentes **el problema no es una fuga de memoria**, es un **efecto
secundario tardío**.

Si el usuario pulsa «Guardar» y se marcha antes de que responda el
servidor, la suscripción sigue viva y ejecuta su `next`:

```ts
next: (created) => this.router.navigate(['/incidents', created.id]),
```

Resultado: el usuario está tranquilamente en otra pantalla y la aplicación
lo saca de ahí sin que él haya hecho nada. Es un fallo desconcertante y
difícil de reproducir. `takeUntilDestroyed` lo corta de raíz.

## 2. Conceptos del día

### Suscripciones que no hay que gestionar

La mejor suscripción es la que no se escribe. En el proyecto hay tres
mecanismos que las evitan por completo:

| Mecanismo | Dónde | Se limpia |
|---|---|---|
| `toSignal` | búsqueda reactiva (Día 16) | solo |
| `async` pipe | — | solo |
| Señales del servicio | listado, panel, detalle | no hay nada que limpiar |

El pipeline del Día 16, con sus cinco operadores, **no tiene ni un
`subscribe`**: `toSignal` se encarga. Por eso este día resultó corto en el
listado — el trabajo ya estaba hecho.

No se usa el `async` pipe en ningún sitio, y es una decisión consciente: con
el estado ya en señales, meter Observables en la plantilla sería dar un
rodeo.

### `takeUntilDestroyed`

Corta el flujo cuando el componente se destruye. Tiene dos formas:

```ts
// En el constructor o en la inicialización de un campo (contexto de inyección)
takeUntilDestroyed()

// En cualquier otro método: hay que pasarle el DestroyRef
takeUntilDestroyed(this.destroyRef)
```

La segunda forma es la que se usa en los manejadores de eventos, porque
`onSubmitted()` no se ejecuta en un contexto de inyección.

### `DestroyRef`

Sustituye a implementar `OnDestroy`, con dos ventajas: se puede inyectar
donde haga falta (no obliga a la clase a implementar una interfaz) y sirve
para registrar limpiezas puntuales:

```ts
this.destroyRef.onDestroy(() => window.removeEventListener('online', onOnline));
```

### Temporizadores y listeners: lo que Angular no limpia

Un `setInterval` o un `addEventListener` **sobreviven al componente**.
Angular no sabe de ellos. Se añadieron los dos, a propósito, para tratar
cada caso con su herramienta:

**Temporizador** (refresco automático cada 30 s), con RxJS:

```ts
toObservable(this.autoRefresh)
  .pipe(
    switchMap((enabled) => (enabled ? interval(AUTO_REFRESH_MS) : EMPTY)),
    filter(() => !this.incidentService.loading()),
    takeUntilDestroyed(),
  )
  .subscribe(() => this.incidentService.load());
```

Dos detalles deliberados:

- El `interval` **solo existe mientras el refresco está activo**. Lo fácil
  sería crearlo siempre y descartar sus emisiones con un `filter`, pero eso
  deja un temporizador corriendo para nada. Con `switchMap` sobre `EMPTY`,
  apagarlo lo cancela de verdad. Hay una prueba que lo distingue.
- El `filter` sobre `loading()` evita que una recarga se solape con otra
  todavía en vuelo.

**Listener del navegador** (recargar al recuperar la conexión), con
`DestroyRef`:

```ts
window.addEventListener('online', onOnline);
this.destroyRef.onDestroy(() => window.removeEventListener('online', onOnline));
```

### Los hooks utilizados (actividad 5)

El inventario completo del proyecto, que es más corto de lo que uno
esperaría:

| Hook / mecanismo | ¿Se usa? | Dónde y por qué |
|---|---|---|
| `constructor` | Sí | montar el temporizador y el listener; contexto de inyección válido |
| `DestroyRef` | Sí | `IncidentList`, para cortar suscripciones y quitar el listener |
| `takeUntilDestroyed` | Sí | listado, alta y edición |
| `ngOnInit` | **No** | los datos los carga el servicio y los parámetros llegan como inputs |
| `ngOnDestroy` | **No** | lo cubre `DestroyRef`, sin obligar a implementar la interfaz |
| `ngOnChanges` | **No** | los inputs son señales: se reacciona con `computed` o `effect` |
| `ngAfterViewInit` | **No** | no se manipula el DOM a mano (Día 8) |

Sobre `ngOnInit`: la razón de que no haga falta es que **nadie carga datos
en un componente**. El servicio los pide al construirse (Día 15) y las
páginas leen señales. Y `:id` llega como input gracias a
`withComponentInputBinding` (Día 13), en vez de leerse de `ActivatedRoute`
dentro de un `ngOnInit`.

## 3. Paso a paso — cómo lo hicimos

1. **Auditar** las suscripciones y los hooks existentes (la tabla de arriba).
2. **Aplicar `takeUntilDestroyed`** en las tres suscripciones de componentes,
   con `DestroyRef` porque están dentro de métodos.
3. **Añadir el temporizador controlado** de refresco automático, con su
   interruptor en la interfaz.
4. **Añadir el listener `online`** con su baja registrada en `DestroyRef`.
5. **Pruebas** (7 nuevas), que es donde se demuestra que la limpieza
   funciona de verdad:

   - el componente arranca **sin ningún temporizador** (si lo hubiera,
     `fakeAsync` protestaría al terminar la prueba);
   - recarga cada 30 s mientras está activo;
   - al apagarlo **se cancela**, no solo se ignoran sus avisos;
   - tras `fixture.destroy()`, avanzar 90 s no dispara ninguna recarga;
   - tras destruir, un evento `online` ya no hace nada;
   - una eliminación en vuelo no toca el servicio si el componente murió
     antes de la respuesta.

   Estas pruebas son valiosas porque una fuga no se nota en desarrollo: solo
   aparece tras navegar veinte veces entre pantallas.

6. **Verificar**:

   ```bash
   ng build                                          # sin errores
   ng test --watch=false --browsers=ChromeHeadless   # 250 SUCCESS
   ```

7. **Commit** con el mensaje sugerido por el reto:

   ```bash
   git commit -m "refactor(rxjs): prevent subscription and lifecycle memory leaks"
   ```

## 4. Resultado

- Las cuatro suscripciones auditadas, con su decisión razonada anotada.
- Ninguna suscripción de componente puede sobrevivirle.
- Un temporizador que solo existe cuando sirve, y un listener del navegador
  con su baja registrada.
- Cero `ngOnInit` y cero `ngOnDestroy` en todo el proyecto.
- 250 pruebas en verde (243 anteriores + 7 nuevas).
