# Día 24 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **pruebas unitarias de servicios y componentes.**
>
> La guía completa de cómo se escriben las pruebas aquí está en
> [`guia-de-pruebas.md`](guia-de-pruebas.md).

## 1. Punto de partida: casi todo ya estaba

Las seis primeras actividades del día piden probar cosas que se fueron
probando el mismo día que se construyeron. La comprobación, prueba a
prueba:

### 1. Probar la creación de una incidencia

| Prueba | Dónde |
|---|---|
| «añade la incidencia y completa lo que decide el dominio» | [`incident-store.spec.ts:88`](../src/app/core/state/incident-store.spec.ts) |
| «la colección solo cambia cuando el servidor confirma» | `incident-store.spec.ts:99` |
| «la incidencia persiste en el servidor» | `incident-store.spec.ts:110` |
| «genera identificadores distintos en creaciones sucesivas» | `incident-store.spec.ts:121` |
| «registra la incidencia con el usuario de la sesión» | [`incident-new.spec.ts:42`](../src/app/features/incidents/pages/incident-new/incident-new.spec.ts) |
| «navega al detalle de la incidencia recién creada» | `incident-new.spec.ts:52` |

### 2. Probar la eliminación

| Prueba | Dónde |
|---|---|
| «elimina la incidencia» | [`incident-store.spec.ts:181`](../src/app/core/state/incident-store.spec.ts) |
| «la eliminación persiste en el servidor» | `incident-store.spec.ts:189` |
| «informa del error si la incidencia no existe» | `incident-store.spec.ts:199` |
| «al eliminar la seleccionada, la selección se limpia» | `incident-store.spec.ts` (selección) |
| «elimina la incidencia del contenedor cuando el hijo lo solicita» | [`incident-list.spec.ts:71`](../src/app/features/incidents/pages/incident-list/incident-list.spec.ts) |

### 3. Probar un selector del store

Hay selectores probados de los cuatro tipos que tiene el store:

| Selector | Prueba | Dónde |
|---|---|---|
| Indicadores | «cuentan el total, las críticas y las abiertas» | `incident-store.spec.ts:212` |
| Reactividad | «se recalculan solos al eliminar» | `incident-store.spec.ts:220` |
| Selección | «selecciona por identificador» | `incident-store.spec.ts:291` |
| Filtrado | «filtra la lista visible sin tocar la colección» | `incident-store.spec.ts:344` |
| Paginación | «reparte los resultados en páginas del tamaño configurado» | `incident-store.spec.ts:455` |

### 4. Probar la emisión de eventos de `IncidentCard`

| Prueba | Dónde |
|---|---|
| «emite la incidencia recibida al seleccionar» | [`incident-card.spec.ts:38`](../src/app/features/incidents/components/incident-card/incident-card.spec.ts) |
| «emite la incidencia recibida al pedir eliminarla, sin modificarla» | `incident-card.spec.ts:47` |

La segunda comprueba además que el hijo **no modifica** la incidencia que
recibe, que era el criterio del Día 5.

### 5. Probar el estado vacío

| Prueba | Dónde |
|---|---|
| «muestra el mensaje y la aclaración» | [`empty-state.spec.ts:30`](../src/app/shared/components/empty-state/empty-state.spec.ts) |
| «proyecta la acción opcional» | `empty-state.spec.ts:39` |
| «no deja rastro de lo que no se le pasa» | `empty-state.spec.ts:51` |
| «muestra el estado vacío al eliminar todas y permite restaurar» | [`incident-list.spec.ts:107`](../src/app/features/incidents/pages/incident-list/incident-list.spec.ts) |
| «un término sin coincidencias muestra el mensaje de filtros» | `incident-list.spec.ts` (búsqueda) |

Los dos últimos cubren los **dos** estados vacíos, que dicen cosas
distintas: «no hay incidencias» y «ninguna coincide con los filtros».

### 6. Probar las validaciones del formulario

**53 pruebas** en
[`incident-form.spec.ts`](../src/app/features/incidents/components/incident-form/incident-form.spec.ts)
y **24** en
[`incident-validators.spec.ts`](../src/app/shared/validators/incident-validators.spec.ts).
Las agrupaciones:

| Bloque | Qué cubre |
|---|---|
| `describe('validación')` | obligatorios, longitud mínima y máxima, `aria-invalid` y su mensaje |
| `describe('envío')` | que no emite si es inválido y que revela los cuatro errores |
| `describe('validadores personalizados')` | solo espacios y palabras restringidas |
| `describe('etiquetas dinámicas')` | vacías, duplicadas y tope de cinco |
| `incident-validators.spec.ts` | los cuatro validadores por separado, sin `TestBed` |

### 7. Configurar un reporte de cobertura

Tres archivos:

| Archivo | Qué aporta |
|---|---|
| [`karma.conf.js`](../karma.conf.js) | cuatro formatos de informe (`html`, `text-summary`, `json-summary`, `lcovonly`) y los umbrales de `check.global` |
| [`angular.json`](../angular.json) | `"karmaConfig": "karma.conf.js"` en el objetivo `test` |
| [`package.json`](../package.json) | los scripts `test`, `test:ci` y `test:coverage` |

Los umbrales que rompen la build:

```js
check: { global: { statements: 90, branches: 80, functions: 90, lines: 90 } }
```

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
