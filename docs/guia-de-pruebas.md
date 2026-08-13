# Guía de pruebas

> Cómo se escriben las pruebas en este proyecto: los conceptos que hay que
> conocer, el paso a paso para crear una nueva y los patrones que fuimos
> descubriendo a lo largo del reto.
>
> Estado actual: **311 pruebas en 24 archivos**, todas en verde.

---

## 1. Conceptos que hay que conocer

### Las tres piezas de Jasmine

Jasmine es el marco de pruebas que trae Angular por defecto. Solo hace falta
entender tres cosas:

```ts
describe('IncidentPriorityPipe', () => {   // 1. agrupa pruebas relacionadas
  it('traduce HIGH a "Alta"', () => {      // 2. una prueba concreta
    expect(pipe.transform('HIGH')).toBe('Alta');  // 3. la comprobación
  });
});
```

- **`describe`** agrupa. Se pueden anidar para organizar por escenario
  (`describe('entradas inválidas')`).
- **`it`** describe **un comportamiento**, en lenguaje natural. El nombre
  debe leerse como una frase: *«devuelve cadena vacía para null»*, no
  *«test 3»*.
- **`expect`** compara. Los *matchers* más usados aquí:

| Matcher | Para qué |
|---|---|
| `toBe(x)` | identidad (`===`) — objetos: la **misma** referencia |
| `toEqual(x)` | igualdad por contenido — para objetos y arreglos |
| `toContain(x)` | un elemento en un arreglo, o un texto dentro de otro |
| `toBeTruthy()` / `toBeNull()` | existencia |
| `toHaveBeenCalledWith(...)` | qué recibió un espía |
| `toThrow()` | que algo falle a propósito |

La diferencia entre `toBe` y `toEqual` importa más de lo que parece. Esta
prueba del Día 9 solo funciona con `toBe`, porque comprueba precisamente que
son **objetos distintos**:

```ts
it('devuelve un arreglo nuevo, no la colección interna', () => {
  expect(service.getAll()).not.toBe(service.getAll());
});
```

### `beforeEach`: partir siempre del mismo sitio

Se ejecuta antes de **cada** `it`, no una vez por `describe`. Esa es la
garantía de que una prueba no contamine a la siguiente:

```ts
beforeEach(() => {
  prepareApi();          // backend simulado en su estado inicial
  TestBed.configureTestingModule({ providers: [provideTestApi()] });
});
```

### `TestBed`: el Angular de mentira

`TestBed` monta un módulo Angular mínimo para la prueba. Es donde se declara
qué se importa y qué se inyecta:

```ts
await TestBed.configureTestingModule({
  imports: [IncidentList],                          // el componente a probar
  providers: [provideRouter([]), provideTestApi()], // lo que necesita
}).compileComponents();
```

Regla práctica: **si el componente lo inyecta, la prueba lo tiene que
proveer.** El 90 % de los errores del tipo `NullInjectorError` o
`No provider for X` se arreglan añadiendo el proveedor aquí.

### `ComponentFixture`: el componente montado

```ts
fixture = TestBed.createComponent(IncidentList);
component = fixture.componentInstance;   // la clase
fixture.nativeElement;                   // el DOM que ha pintado
fixture.detectChanges();                 // «pinta los cambios»
```

`detectChanges()` es el que más se olvida. Angular no repinta solo en las
pruebas: si se cambia algo y no se llama, el DOM sigue mostrando lo viejo y
la prueba falla sin motivo aparente.

### Espías (`spyOn`)

Sustituyen o vigilan un método:

```ts
// Vigila sin cambiar el comportamiento
spyOn(service, 'remove').and.callThrough();
clickIn(cards()[0], 'Eliminar incidencia');
expect(service.remove).toHaveBeenCalledWith('inc-001');

// Sustituye: evita que la navegación ocurra de verdad
spyOn(router, 'navigate');
```

`callThrough()` es importante: sin él, el método espiado **no se ejecuta** y
se acaba probando el espía en lugar del código.

---

## 2. Los cinco tipos de prueba del proyecto

Ordenados de más simple a más costosa. **Siempre la más simple que sirva.**

| Tipo | Necesita | Ejemplo |
|---|---|---|
| Función pura | nada | [validadores](../src/app/shared/validators/incident-validators.spec.ts) |
| Pipe | nada | [relative-time](../src/app/shared/pipes/relative-time-pipe.spec.ts) |
| Servicio | `TestBed.inject` | [incident-service](../src/app/core/services/incident-service.spec.ts) |
| Componente / directiva | fixture + DOM | [incident-form](../src/app/features/incidents/components/incident-form/incident-form.spec.ts) |
| Rutas | router real | [app.routes](../src/app/app.routes.spec.ts) |

### 2.1 Funciones puras y pipes: sin `TestBed`

Un validador o un pipe no necesitan Angular. Se instancian con `new` y ya:

```ts
const pipe = new IncidentPriorityPipe();
expect(pipe.transform('HIGH')).toBe('Alta');
```

Son las pruebas más baratas y rápidas. Por eso conviene que la lógica viva
en funciones puras siempre que se pueda: se prueba mejor.

### 2.2 Servicios: `TestBed.inject`

```ts
TestBed.configureTestingModule({ providers: [provideTestApi()] });
service = TestBed.inject(IncidentService);
```

Nunca `new IncidentService()`: el servicio inyecta cosas y necesita el
contexto de inyección. Cuando de verdad hace falta una instancia nueva —por
ejemplo, para simular el arranque tras recargar la página—, se hace dentro
del contexto:

```ts
function freshService(): AuthService {
  return TestBed.runInInjectionContext(() => new AuthService());
}
```

### 2.3 Componentes: interactuar como un usuario

La regla que seguimos: **actuar sobre el DOM, no sobre la clase**. En vez de
llamar a `component.onSubmit()`, se dispara el evento real:

```ts
function submit(): void {
  fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
  tick();
  fixture.detectChanges();
}
```

Así la prueba comprueba que el botón está bien conectado, no solo que el
método funciona.

### 2.4 Directivas: hacen falta un componente anfitrión

Una directiva no se puede instanciar con `new`: necesita un elemento sobre
el que actuar. Se declara un componente mínimo dentro del propio spec:

```ts
@Component({
  imports: [IncidentHighlight],
  template: `
    <article id="card" [appIncidentHighlight]="priority()">Tarjeta</article>
    <p id="paragraph" [appIncidentHighlight]="priority()">Párrafo</p>
  `,
})
class HostComponent {
  readonly priority = signal<IncidentPriority | string | null>('LOW');
}
```

Ventaja añadida: aplicarla sobre **varias etiquetas distintas** demuestra en
la propia prueba que no depende de ninguna.

### 2.5 Rutas: navegación de verdad

```ts
await router.navigate(['/incidents/inc-003']);
expect(location.path()).toBe('/incidents/inc-003');
```

Resuelve los `loadComponent` y `loadChildren` reales, así que detecta cosas
que ninguna otra prueba ve — como que `:id` capture la palabra `new`.

---

## 3. Paso a paso: crear una prueba nueva

### Paso 1 — Elegir el archivo

Junto al código, con el mismo nombre y sufijo `.spec.ts`:

```
incident-form.ts  →  incident-form.spec.ts
```

Si el archivo se genera con el CLI ya viene creado. Ojo: **el esqueleto que
genera el CLI muchas veces no sirve** (ver sección 6).

### Paso 2 — Montar el escenario

Copiar el `beforeEach` de un spec parecido. Para casi todo lo que toque
datos:

```ts
beforeEach(async () => {
  prepareApi();
  await TestBed.configureTestingModule({
    imports: [MiComponente],
    providers: [provideRouter([]), provideTestApi()],
  }).compileComponents();
});

beforeEach(fakeAsync(() => {
  service = loadIncidents();          // espera la carga inicial
  fixture = TestBed.createComponent(MiComponente);
  fixture.detectChanges();
}));
```

Los ayudantes están en
[`testing/api-testing.ts`](../src/app/testing/api-testing.ts):

| Ayudante | Qué hace |
|---|---|
| `prepareApi()` | backend simulado a su estado inicial, sin latencia, sin sesión |
| `provideTestApi()` | HTTP con **la misma cadena de interceptores** que la app |
| `loadIncidents()` | inyecta el servicio y espera su carga inicial |
| `loginForTest()` | inicia sesión |
| `TEST_CREDENTIALS` | credenciales válidas del backend simulado |

### Paso 3 — Escribir el `it` como una frase

```ts
it('rechaza un título formado solo por espacios', () => { … });
```

No: `it('test title validation')`. El nombre de la prueba es documentación —
cuando falla, es lo primero que se lee.

### Paso 4 — Estructurar en tres bloques

Preparar, actuar, comprobar. Con una línea en blanco entre ellos:

```ts
it('elimina la incidencia del contenedor cuando el hijo lo solicita', fakeAsync(() => {
  const removed = MOCK_INCIDENTS[0];              // preparar

  clickIn(cards()[0], 'Eliminar incidencia');     // actuar

  expect(cards().length).toBe(MOCK_INCIDENTS.length - 1);   // comprobar
  expect(text()).not.toContain(removed.title);
}));
```

### Paso 5 — Extraer ayudantes al final del `describe`

Cuando una acción se repite, se convierte en función con nombre. Compárese:

```ts
// Antes
const input = fixture.nativeElement.querySelector('#search-term');
input.value = 'impresora';
input.dispatchEvent(new Event('input'));
tick(300);
fixture.detectChanges();

// Después
search('impresora');
```

Las pruebas se leen como una descripción del comportamiento, no como
manipulación del DOM.

### Paso 6 — Ejecutar

```bash
# Todas, una vez (lo que se usa para verificar)
npx ng test --watch=false --browsers=ChromeHeadless

# En marcha mientras se programa
npx ng test

# Solo un archivo: cambiar temporalmente `describe` por `fdescribe`
# (y acordarse de revertirlo)
```

---

## 4. Asincronía: la parte que más cuesta

### `fakeAsync` + `tick()`

Controla el tiempo. Sirve para HTTP simulado, `debounceTime`, `setTimeout` e
`interval`:

```ts
it('no consulta al servidor en cada tecla', fakeAsync(() => {
  type_('#search-term', 'imp');
  expect(spy).not.toHaveBeenCalled();   // aún dentro de la ventana

  tick(300);                            // avanza el reloj

  expect(spy).toHaveBeenCalledTimes(1);
}));
```

- `tick()` — avanza lo justo para resolver lo pendiente.
- `tick(300)` — avanza 300 ms.
- Si al terminar quedan temporizadores vivos, `fakeAsync` **falla a
  propósito**. Eso es una función, no un estorbo: así se detecta un
  `interval` que nadie canceló.

### Cuándo NO usar `fakeAsync`

Esta es la lección más cara del proyecto, del Día 19.

**`tick()` no puede adelantar promesas reales**, y los `import()` de la carga
diferida lo son. Un spec de rutas con `fakeAsync` pasaba o fallaba **según el
orden aleatorio en que Karma ejecutara los tests**, porque dependía de si
otro test ya había cargado ese fragmento.

La solución fue `async`/`await` sobre navegaciones reales:

```ts
it('resuelve el detalle con su parámetro', async () => {
  await goTo(['/incidents', 'inc-003']);

  expect(location.path()).toBe('/incidents/inc-003');
});
```

**Regla:** `fakeAsync` para controlar el tiempo; `async`/`await` cuando solo
hay que esperar a que algo termine.

Y sobre todo: **un test intermitente es peor que no tenerlo**, porque enseña
a ignorar los fallos. Si uno falla a veces, hay que arreglar la causa, no
repetir la corrida hasta que pase. La forma de confirmarlo es ejecutar la
batería varias veces seguidas.

### HTTP: dos formas, según lo que se quiera probar

| Herramienta | Cuándo | Ejemplo |
|---|---|---|
| Backend simulado (`provideTestApi`) | probar el **comportamiento** | «al eliminar, la lista baja a 4» |
| `HttpTestingController` | probar la **petición** | «usa DELETE sobre /api/incidents/inc-001» |

Con `HttpTestingController` se controla la respuesta a mano:

```ts
api.remove('inc-001').subscribe();

const request = http.expectOne('/api/incidents/inc-001');
expect(request.request.method).toBe('DELETE');
request.flush(null);              // responde
// request.flush(null, { status: 500, statusText: 'Error' });  // o falla
```

Y `afterEach(() => http.verify())` avisa si quedó alguna petición sin
atender.

---

## 5. Patrones específicos de este proyecto

### Inputs requeridos: `setInput` antes del primer `detectChanges`

```ts
fixture = TestBed.createComponent(IncidentCard);
fixture.componentRef.setInput('incident', INCIDENT);  // ← antes
fixture.detectChanges();
```

Si se hace al revés, el componente revienta porque le falta un input
obligatorio.

### Probar el efecto, no el detalle

Lección del Día 10. Una prueba comprobaba que la directiva aplicaba la clase
`is-critical`, y pasaba… mientras el resaltado **no se veía**, porque el CSS
del componente ganaba en especificidad. La clase estaba; el efecto no.

```ts
it('aplica el resaltado visible, no solo la clase', () => {
  const styles = getComputedStyle(card);

  expect(card.classList).toContain('is-critical');
  expect(styles.borderLeftWidth).toBe('4px');       // ← lo que ve el usuario
  expect(styles.borderLeftColor).toBe('rgb(185, 28, 28)');
});
```

### Buscar por nombre accesible, no por clase CSS

Los ayudantes buscan los botones como los encontraría una persona:

```ts
function accessibleName(element: HTMLElement): string {
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  if (element.id) {
    const label = fixture.nativeElement.querySelector(`label[for="${element.id}"]`);
    if (label?.textContent?.trim()) return label.textContent.trim();
  }

  return element.textContent?.trim() ?? '';
}
```

Doble beneficio: la prueba no se rompe al renombrar una clase, y **si un
control no tiene nombre accesible, la prueba no lo encuentra** — así que la
accesibilidad queda verificada de paso.

### Probar la limpieza (Día 17)

Una fuga no se nota en desarrollo: aparece tras navegar veinte veces. Se
prueba destruyendo el componente y comprobando que ya no pasa nada:

```ts
it('el temporizador muere con el componente', fakeAsync(() => {
  toggleAutoRefresh();
  const spy = spyOn(service, 'load').and.callThrough();

  fixture.destroy();
  tick(AUTO_REFRESH_MS * 3);

  expect(spy).not.toHaveBeenCalled();
}));
```

### Datos deterministas

Nada de `Date.now()` dentro de una prueba. El `RelativeTimePipe` recibe el
instante de referencia como argumento justo para esto:

```ts
const NOW = new Date('2026-08-05T12:00:00.000Z');
expect(pipe.transform('2026-08-01T12:00:00.000Z', NOW)).toBe('hace 4 días');
```

Si una prueba depende del reloj real, algún día fallará sola.

### Casos en tabla

Cuando el mismo comportamiento se repite con datos distintos:

```ts
const cases: readonly (readonly [IncidentPriority, string])[] = [
  ['LOW', 'Baja'],
  ['MEDIUM', 'Media'],
  ['HIGH', 'Alta'],
  ['CRITICAL', 'Crítica'],
];

for (const [value, expected] of cases) {
  it(`traduce ${value} a "${expected}"`, () => {
    expect(pipe.transform(value)).toBe(expected);
  });
}
```

Cada caso sale como una prueba propia, así que el informe dice exactamente
cuál falló.

---

## 6. Errores que cometimos (y qué aprender de ellos)

| Error | Qué pasó | Lección |
|---|---|---|
| Confiar en el esqueleto del CLI | `new IncidentHighlight()` falla: una directiva necesita contexto de inyección y un elemento | El generador da un punto de partida, no una prueba |
| `fakeAsync` con carga diferida | Tests intermitentes según el orden de Karma | `tick()` no adelanta promesas reales |
| Comprobar la clase y no el estilo | La directiva «funcionaba» pero no se veía nada | Probar lo que ve el usuario |
| Olvidar `provideRouter` / `provideTestApi` | `NullInjectorError` en cascada | Si se inyecta, se provee |
| Navegar a la URL actual | El guard no se ejecutaba y la prueba no probaba nada | Repetir la ruta actual no dispara navegación |
| Aserción sensible a mayúsculas | `toContain('no existe')` contra `'No existe…'` | Los matchers de texto distinguen mayúsculas |

Y una observación que se repitió varias veces: **cuando una prueba se pone
en rojo tras un cambio, lo primero es preguntarse si tiene razón.** Al añadir
el validador de palabras restringidas (Día 12), una prueba del Día 11 falló
porque su título de ejemplo contenía «prueba». No era un fallo del código: el
dato había dejado de ser válido.

---

## 7. Antes de dar algo por terminado

```bash
npx ng build                                       # compila
npx ng test --watch=false --browsers=ChromeHeadless # 311 SUCCESS
```

Lista de comprobación:

- [ ] Todas las pruebas en verde, y **ejecutadas dos veces** si se tocó algo asíncrono.
- [ ] La prueba nueva **falla** si se rompe el código a propósito. Una prueba que pasa siempre no prueba nada.
- [ ] El nombre del `it` describe el comportamiento, no la implementación.
- [ ] Nada de `fdescribe` ni `fit` olvidados (harían que el resto no se ejecute).
- [ ] Los casos límite están cubiertos: `null`, cadena vacía, colección vacía, valor desconocido.
- [ ] Si el cambio es visual, se comprobó **el estilo computado** o con una captura, no solo la clase.

---

## 8. Dónde mirar un ejemplo de cada cosa

| Quiero probar… | Mirar |
|---|---|
| Una función pura | [`incident-validators.spec.ts`](../src/app/shared/validators/incident-validators.spec.ts) |
| Un pipe | [`relative-time-pipe.spec.ts`](../src/app/shared/pipes/relative-time-pipe.spec.ts) |
| Un servicio con HTTP | [`incident-service.spec.ts`](../src/app/core/services/incident-service.spec.ts) |
| Una petición concreta | [`incident-api.spec.ts`](../src/app/core/api/incident-api.spec.ts) |
| Un interceptor | [`interceptors.spec.ts`](../src/app/core/http/interceptors.spec.ts) |
| Una directiva | [`incident-highlight.spec.ts`](../src/app/shared/directives/incident-highlight.spec.ts) |
| Un formulario | [`incident-form.spec.ts`](../src/app/features/incidents/components/incident-form/incident-form.spec.ts) |
| Búsqueda con RxJS | [`incident-list.spec.ts`](../src/app/features/incidents/pages/incident-list/incident-list.spec.ts) |
| Rutas y guards | [`app.routes.spec.ts`](../src/app/app.routes.spec.ts) |
| Autenticación | [`auth-service.spec.ts`](../src/app/core/services/auth-service.spec.ts) |
