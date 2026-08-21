# Cómo medir el rendimiento de la detección de cambios

> Complemento del [Día 26](dia-26-conceptos-y-pasos.md), paso «medir el
> resultado».
>
> El Día 26 dijo que las llamadas de plantilla pasaron de 120 a 0. La pregunta
> razonable es: **¿de dónde sale ese número?** Esto lo explica, y deja la
> medición hecha de forma que se pueda repetir.

## El problema de fondo

Optimizar la detección de cambios es raro porque **el resultado es invisible**.
Si arreglas un color, lo ves. Si consigues que Angular deje de reevaluar una
plantilla doce veces por segundo, la pantalla se ve exactamente igual.

Sin una cifra, «va más rápido» es una sensación. Y las sensaciones sobre
rendimiento suelen estar equivocadas.

Lo que hay que contar no es tiempo —el tiempo varía con la máquina, con la
carga y con si tienes otra pestaña reproduciendo vídeo— sino **trabajo**:
cuántas veces Angular reevalúa una plantilla. Ese número es determinista, se
repite igual en cualquier máquina, y es exactamente lo que `OnPush` pretende
reducir.

---

## Antes de nada: dos herramientas que la gente busca y no sirven

Merece la pena decirlo primero, porque casi todas las guías que hay por ahí
mencionan una de las dos.

### `ng.profiler.timeChangeDetection()` — ya no existe

Es la que aparece en la mayoría de tutoriales. **En Angular 20 no está.**
Comprobado en el navegador:

```js
!!window.ng.profiler   // → false
```

Venía de `enableDebugTools()`, que se eliminó. Si la encuentras en un tutorial,
el tutorial es viejo.

### `ng.enableProfiling()` — existe, pero no se puede leer desde código

Ésta sí existe en Angular 20. El problema es cómo publica lo que mide. Mirando
el código de `@angular/core`:

```js
console.timeStamp(entryName, 'Event_…', undefined, '🅰️ Angular', …)
```

Usa **`console.timeStamp()`**, no `performance.measure()`. Eso pinta una pista
llamada «🅰️ Angular» en el panel Rendimiento de Chrome, y **nada más**. No
deja ninguna entrada que un script pueda leer:

```
measures antes de enableProfiling:   24
measures después de 10 ciclos:       24     ← ni una
```

Conclusión: `enableProfiling()` es útil **mirando** el panel Rendimiento, no
para automatizar nada. Si lo que quieres es un número en una prueba, no es por
ahí.

---

## Lo que sí funciona: `ng.ɵsetProfiler`

Angular expone un gancho al que avisa de **cada evento** del ciclo de
detección. Es lo que usan por dentro las herramientas de desarrollo, y se
puede usar desde una prueba.

```js
window.ng.ɵsetProfiler((evento) => { /* llega un número por cada evento */ });
// …hacer que ocurra algo…
window.ng.ɵsetProfiler(null);   // desconectar
```

Los eventos que importan:

| Código | Evento | Qué significa |
|---|---|---|
| `2` | **TemplateUpdate** | **se reevaluó una plantilla** ← la cifra a vigilar |
| `12` | ChangeDetection | empezó un ciclo completo |
| `4` | LifecycleHook | se ejecutó un hook |
| `18` | Component | se entró a comprobar un componente |
| `0` | TemplateCreate | se creó una plantilla (solo al montar) |

**`TemplateUpdate` es la métrica.** Es literalmente el trabajo que `OnPush`
existe para evitar.

> La `ɵ` avisa de que es API interna y puede cambiar de versión. Es un riesgo
> asumible **en pruebas** —si cambia, la prueba falla y te enteras— pero no
> debe aparecer en el código de la aplicación.

---

## La utilidad del proyecto

Todo lo anterior está envuelto en
[`src/app/testing/perf-testing.ts`](../src/app/testing/perf-testing.ts):

```ts
import { measureChangeDetection } from '../../testing/perf-testing';

const conteo = measureChangeDetection(() => {
  for (let i = 0; i < 10; i++) fixture.detectChanges();
});

conteo.templateUpdates    // ← 0 si OnPush hace su trabajo
conteo.changeDetections   // ← 10, los ciclos que pediste
```

O el atajo, para el caso de siempre:

```ts
expect(countTemplateUpdates(fixture, 10)).toBe(0);
```

---

## Cómo se mide, en cuatro pasos

### 1 · Ciclos sin cambiar nada

La clave del método: se ejecutan diez ciclos de detección **sin tocar el
estado**. Nada ha cambiado, así que **el trabajo correcto es cero**. Todo lo
que se cuente por encima de cero es trabajo que nadie pidió.

```ts
const conteo = measureChangeDetection(() => {
  for (let i = 0; i < 10; i++) fixture.detectChanges();
});
```

### 2 · Comprobar que la medición ocurrió

Esto es lo que separa una medición de un autoengaño:

```ts
expect(conteo.changeDetections).toBe(10);   // ← primero esto
expect(conteo.templateUpdates).toBe(0);
```

Sin la primera línea, un `0` en la segunda puede significar dos cosas muy
distintas: que todo va perfecto, o que **no se midió nada** porque el profiler
no llegó a engancharse. Un cero por avería se parece demasiado a un cero por
éxito.

### 3 · Leer el número

| `templateUpdates` en 10 ciclos | Qué significa |
|---|---|
| **0** | correcto: nada cambió, nada se reevaluó |
| **10** | una plantilla se reevalúa en cada ciclo — falta `OnPush`, o algo rompe la igualdad por referencia |
| **20, 120…** | varias plantillas, o varias expresiones caras, reevaluándose en cada pasada |

### 4 · Dejarlo como prueba

Una medición hecha a mano se pierde. Convertida en prueba, avisa sola:

```ts
it('no reevalúa la plantilla en 10 ciclos sin cambios', () => {
  const conteo = measureChangeDetection(() => {
    for (let i = 0; i < 10; i++) fixture.detectChanges();
  });

  expect(conteo.changeDetections).toBe(10);
  expect(conteo.templateUpdates).toBe(0);
});
```

Está en
[`login.spec.ts`](../src/app/features/auth/pages/login/login.spec.ts).

---

## Que la prueba funciona, comprobado

Una prueba de rendimiento que pasa no vale nada si nunca falla. Se verificó
quitando `OnPush` del componente y volviendo a ejecutar:

| | `templateUpdates` en 10 ciclos |
|---|---|
| Con `ChangeDetectionStrategy.OnPush` | **0** |
| Sin `OnPush` | **20** |

```
Expected 20 to be 0.
TOTAL: 2 FAILED, 453 SUCCESS
```

Veinte reevaluaciones, dos por ciclo, para pintar exactamente lo mismo. Ése es
el trabajo que `OnPush` ahorra, y ahora hay un número que lo dice.

---

## Por qué el Día 26 midió de otra forma

El Día 26 no usó el profiler: envolvió los métodos del componente y contó
llamadas.

```ts
const original = componente.showError;
let llamadas = 0;
componente.showError = function (...args) {
  llamadas++;
  return original.apply(this, args);
};
```

Responde a otra pregunta, y las dos son útiles:

| | Qué responde |
|---|---|
| **Envolver métodos** | ¿cuántas veces se llama **a esta función concreta**? |
| **`ɵsetProfiler`** | ¿cuánto trabajo hace Angular **en total**? |

El conteo de métodos fue lo adecuado ese día porque el problema era concreto:
llamar a `showError()` desde la plantilla, doce veces por ciclo. El profiler
no lo habría señalado con tanta precisión — habría dicho «esta plantilla se
reevalúa», no «este método es el caro».

La regla: **el profiler para saber si hay un problema; envolver métodos para
saber cuál es**.

---

## Las otras dos formas de medir, para lo que las pruebas no ven

### Panel Rendimiento de Chrome

Es donde `enableProfiling()` sí sirve:

1. Abrir la aplicación en desarrollo.
2. En la consola: `ng.enableProfiling()`.
3. Pestaña **Rendimiento** → grabar → interactuar → parar.
4. Buscar la pista **🅰️ Angular**.

Ahí aparecen los ciclos con nombre y duración: `Change detection 0`,
`Synchronization 1`, `Bootstrap application`… Sirve para ver **dónde** se va
el tiempo en una interacción real, que es justo lo que una prueba unitaria no
puede decirte.

Lo que hay que mirar es la **anchura** de las barras y si se repiten al hacer
algo trivial, como escribir una letra.

### Angular DevTools

La extensión de Chrome, pestaña **Profiler**. Grabas, interactúas, paras, y te
da un mapa de árbol: cada componente, cuánto tardó y **por qué se comprobó**.
Ese «por qué» es lo más valioso que ofrece, y no lo da ninguna otra
herramienta.

### Y el tamaño del paquete, que también es rendimiento

```bash
npm run build
```

```
Initial chunk files    Raw size    Transfer size
                       ~340 kB        ~98 kB
```

**La cifra que cuenta es la de la derecha**, la transferida: es lo que de
verdad se descarga. Preocuparse por el tamaño en crudo es preocuparse por un
número que nadie llega a bajar.

---

## Resumen

| Quiero… | Uso |
|---|---|
| Un número automático que avise si empeora | `measureChangeDetection()` en un `.spec.ts` |
| Saber qué método concreto es el caro | envolver el método y contar (Día 26) |
| Ver dónde se va el tiempo en una interacción real | `ng.enableProfiling()` + panel Rendimiento |
| Saber **por qué** se comprobó un componente | Angular DevTools → Profiler |
| Vigilar lo que se descarga | `npm run build`, columna *transfer size* |

Y dos cosas que **no** hay que usar: `ng.profiler` (no existe) y
`enableProfiling()` esperando leerlo desde código (no deja nada legible).

La idea de todo esto cabe en una frase: **cuenta trabajo, no tiempo**. El
trabajo se repite igual en cualquier máquina; el tiempo, no.
