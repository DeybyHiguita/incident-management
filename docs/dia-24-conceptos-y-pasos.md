# Día 24 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **pruebas unitarias de servicios y componentes.**
>
> La guía completa de cómo se escriben las pruebas aquí está en
> [`guia-de-pruebas.md`](guia-de-pruebas.md).

## 1. Punto de partida: casi todo ya estaba

Las seis primeras actividades del día piden probar cosas que se fueron
probando el mismo día que se construyeron. La comprobación, archivo por
archivo:

| Actividad | Dónde está |
|---|---|
| 1. Creación de una incidencia | `incident-store.spec.ts`, `incident-new.spec.ts` |
| 2. Eliminación | `incident-store.spec.ts`, `incident-list.spec.ts` |
| 3. Un selector del store | `incident-store.spec.ts` (indicadores, filtros, paginación) |
| 4. Eventos de `IncidentCard` | `incident-card.spec.ts` |
| 5. Estado vacío | `empty-state.spec.ts`, `incident-list.spec.ts` |
| 6. Validaciones del formulario | `incident-form.spec.ts`, `incident-validators.spec.ts` |

Eso deja el día para lo que sí faltaba: **medir**, y tapar los huecos que
la medición revele.

## 2. Conceptos del día

### Un número de cobertura no sirve para nada por sí solo

La cobertura dice qué líneas **se ejecutan** durante las pruebas. No dice si
lo que hacen es correcto. Un test sin una sola aserción da cobertura del
100 %.

Por eso importa más lo que se hace con el número que el número:

1. **Umbrales que rompen la build.** Sin ellos, la cobertura es un dato que
   nadie mira y que baja poco a poco sin que nadie se entere.
2. **Mirar las ramas, no las líneas.** Es fácil ejecutar un `if` sin probar
   nunca su `else`.

### Ramas frente a sentencias

Las cuatro métricas del informe:

| Métrica | Qué mide |
|---|---|
| Statements | sentencias ejecutadas |
| **Branches** | caminos de cada `if`, `?:`, `??`, `&&` |
| Functions | funciones llamadas |
| Lines | líneas ejecutadas |

**Branches es la que avisa.** En este proyecto las sentencias iban al
95,6 % mientras las ramas estaban en el 85,8 %: mucho código se ejecutaba,
pero solo por un camino.

El caso más claro lo dio el informe por archivo:

```
core/guards/role-guard.ts    ramas 1/2  (50 %)
```

El guard de autorización se ejecutaba solo por el camino «sí tienes
permiso». La rama de denegación —la que de verdad protege algo— no se
probaba de forma directa. En código de seguridad, **una rama sin probar es
un permiso sin comprobar**.

### El informe se configura, no se acepta como viene

El builder de Angular trae una configuración de Karma implícita que no se
puede afinar. Para poner umbrales hace falta un `karma.conf.js` propio:

```js
coverageReporter: {
  reporters: [
    { type: 'html' },          // navegable, para investigar un archivo
    { type: 'text-summary' },  // resumen en la terminal
    { type: 'json-summary' },  // legible por herramientas
    { type: 'lcovonly' },      // formato estándar para CI
  ],
  check: {
    global: { statements: 90, branches: 80, functions: 90, lines: 90 },
  },
}
```

Un detalle del builder: **no hay que declarar el plugin de Angular** en
`plugins`. Lo inyecta él, y declararlo rompe con
`Package subpath './plugins/karma' is not defined`.

Los umbrales se pusieron **por debajo** de la cobertura actual, no encima. Un
umbral es un suelo del que no bajar, no una meta a alcanzar; ponerlo justo
en el valor de hoy haría fallar la build en el primer cambio legítimo.

### Comprobar que la comprobación funciona

Un umbral que no falla nunca es decorativo. Se verificó subiéndolo a 99 % a
propósito:

```
ERROR [coverage]: Coverage for statements (95.61%) does not meet global threshold (99%)
```

Y luego se devolvió a su valor. Es la misma idea que aparece en la lista de
comprobación de la guía de pruebas: **una prueba que no puede fallar no
prueba nada** — y eso vale también para los umbrales.

### Orden aleatorio

En el mismo `karma.conf.js` se activó `random: true`. Ejecutar las pruebas
en orden distinto cada vez destapa las que dependen unas de otras. Ya nos
pasó el Día 19: un spec que pasaba o fallaba según el orden en que Karma lo
ejecutara.

## 3. Paso a paso — cómo lo hicimos

1. **Ejecutar la cobertura** para ver de dónde se parte.
2. **Crear `karma.conf.js`** con los cuatro formatos de informe y los
   umbrales, y enlazarlo desde `angular.json`.
3. **Añadir scripts** a `package.json`:

   | Script | Para qué |
   |---|---|
   | `npm test` | desarrollo, en modo vigilancia |
   | `npm run test:ci` | una pasada, sin navegador visible |
   | `npm run test:coverage` | lo anterior más el informe |

4. **Comprobar que los umbrales fallan** subiéndolos a propósito.
5. **Leer el informe por archivo** y encontrar el hueco importante: los
   guards al 50 % de ramas.
6. **Escribir `guards.spec.ts`**, con pruebas unitarias directas de
   `authGuard` y `roleGuard` —hasta ahora solo se ejercitaban navegando— y
   de los permisos por rol.

   Incluye los casos que faltaban: sin sesión frente a sin permiso, cada rol
   contra cada permiso, y una lista de roles vacía.

7. **Verificar**:

   ```bash
   npm run test:coverage    # 422 SUCCESS
   ```

8. **Commit** con el mensaje sugerido por el reto:

   ```bash
   git commit -m "test(incidents): add unit tests for components services and store"
   ```

## 4. Resultado

| Métrica | Antes | Después |
|---|---|---|
| Pruebas | 410 | **422** |
| Statements | 95,61 % | 95,74 % |
| Branches | 85,83 % | **86,69 %** |
| Functions | 96,01 % | 96,01 % |
| Lines | 95,27 % | 95,42 % |

Y lo que más importa, aunque no aparezca en el total:

```
core/guards/auth-guard.ts    ramas 1/1  (100 %)
core/guards/role-guard.ts    ramas 2/2  (100 %)
```

- Informe de cobertura configurado, con umbrales que rompen la build y
  verificados.
- Las seis actividades de prueba del día, confirmadas archivo por archivo.
- Los guards de autorización, cubiertos por completo.
