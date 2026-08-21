# Decisiones técnicas

> Entregable del Día 29. Las decisiones que dieron forma al proyecto, cada
> una con **la alternativa que se descartó y por qué**.
>
> Una decisión sin alternativa descartada no es una decisión: es una
> costumbre. Esto es lo que hace falta para entender el código dentro de seis
> meses, o para saber cuándo conviene cambiar de idea.

---

## D-01 · Señales para el estado, RxJS para el tiempo

**Alternativa descartada**: `BehaviorSubject` + `async` en todo, como se hacía
antes de Angular 16.

Las señales son síncronas y se leen sin suscribirse: `store.filtered()`
devuelve un valor, no un flujo que haya que desenvolver. Eso quita las fugas
por suscripciones olvidadas y hace que `computed` se recalcule solo.

**Pero RxJS no sobra.** Se quedó donde no tiene sustituto: lo que ocurre *a lo
largo del tiempo*. El buscador (Día 22) necesita `debounceTime` para no pedir
en cada tecla y `switchMap` para descartar la respuesta de una búsqueda que ya
no interesa. Con señales sueltas eso se escribe a mano, mal y con carreras.

**Cuándo reconsiderarlo**: si apareciera un equivalente de `switchMap` en
señales. A día de hoy no existe.

---

## D-02 · Store propio de señales, sin NgRx

**Alternativa descartada**: NgRx, o `@ngrx/signals`.

El patrón de tres capas —estado privado, selectores de solo lectura,
acciones— cabe en un archivo de unas doscientas líneas y no añade
dependencias. Para un dominio con **una** entidad principal, NgRx pide
acciones, reducers, efectos y selectores para conseguir lo mismo.

**Cuándo reconsiderarlo**: cuando haya varias entidades relacionadas que se
invaliden entre sí, o haga falta viajar en el tiempo para depurar. El patrón
actual es lo bastante parecido como para que la migración no sea traumática.

---

## D-03 · `OnPush` en todos los componentes, desde el principio

**Alternativa descartada**: dejar la detección por defecto y optimizar
después.

Ponerlo al final es carísimo: hay que revisar cada componente para ver qué
suposición se rompió. Puesto desde el principio, se convierte en una
restricción que **empuja hacia el código correcto** — con `OnPush` el estado
mutado en sitio simplemente no se ve, y eso obliga a trabajar con señales y
valores nuevos.

El Día 26 lo midió: **120 evaluaciones de plantilla → 0** en diez ciclos de
detección. La trampa que apareció ahí queda anotada: un array creado *en la
plantilla* es una referencia nueva en cada pasada y anula la ventaja.

---

## D-04 · Backend simulado con un interceptor

**Alternativa descartada**: `json-server`, MSW, o un backend real.

El interceptor no necesita un segundo proceso: se ejecuta dentro de la
aplicación y también en las pruebas, así que **lo que se prueba es la misma
cadena que corre en el navegador**, incluidas cabeceras y errores. Simula
latencia y fallos, que es justo lo que hacía falta para los días de manejo de
errores.

**Coste asumido**: no valida contratos de verdad — si el backend real difiere,
esto no lo detecta (riesgo **R-07**).

**Cómo se apaga**: `useFakeBackend: false` en el entorno. En producción ni
entra en la cadena.

---

## D-05 · `apiBaseUrl` relativa, también en producción

**Alternativa descartada**: poner el dominio del backend en
`environment.production.ts`.

Con una ruta relativa (`/api`), **el mismo paquete compilado sirve en
cualquier dominio**: quien decide a dónde van las peticiones es el servidor o
el proxy, no el código. Con un dominio fijo haría falta una compilación por
entorno, y cada entorno nuevo sería un despliegue nuevo.

Ligado a esto, lo que **nunca** va en un archivo de entorno: claves,
contraseñas, secretos. Todo lo compilado acaba en el navegador y es legible.

---

## D-06 · Errores traducidos en un solo sitio

**Alternativa descartada**: un `catchError` en cada servicio.

`errorHandlingInterceptor` es el último de la cadena de ida, así que recibe el
fallo en crudo y lo convierte en `AppHttpError` —mensaje entendible, `status`
y `correlationId`— antes de que nadie más lo vea. Ningún componente sabe qué
es un `HttpErrorResponse`.

El `correlationId` es lo que hace que un mensaje de error sirva para algo: es
el hilo que une lo que vio la persona usuaria con la línea del registro del
servidor.

---

## D-07 · Carga diferida en todo menos el acceso

**Alternativa descartada**: cargarlo todo de una vez.

Quien entra ve la pantalla de acceso; no tiene sentido descargarle el panel de
administración. El resultado del build es un paquete inicial de **~340 kB en
crudo, ~98 kB transferidos**, y las pantallas llegan cuando se piden.

`@defer` cubre el caso de dentro de una pantalla: partes que están abajo o que
casi nadie abre.

---

## D-08 · Formularios reactivos y tipados

**Alternativa descartada**: formularios de plantilla (`ngModel`).

Un `FormGroup` tipado hace que el compilador conozca cada campo, y deja la
validación en funciones puras que se prueban solas, sin renderizar nada. Los
formularios de plantilla no dan ninguna de las dos cosas, y este proyecto
tiene validaciones cruzadas y un `FormArray`.

---

## D-09 · `<dialog>` nativo para el modal

**Alternativa descartada**: un `<div>` con posición fija, o una librería de
componentes.

`showModal()` trae gratis lo que cuesta semanas hacer bien: **foco atrapado
dentro del diálogo, cierre con Escape, y el resto de la página inerte** para
los lectores de pantalla. Un `<div>` es accesible solo si alguien implementa
todo eso a mano, y casi nunca se hace del todo.

Tiene su arista, anotada el Día 23: el evento `close` llega en un turno
posterior del navegador y **`fakeAsync` no puede adelantarlo**. Las pruebas
esperan al evento de verdad.

---

## D-10 · Umbrales de cobertura, con la cautela de saber qué miden

**Alternativa descartada**: perseguir el 100 %.

Los umbrales (90 % líneas, 80 % ramas) fallan la compilación si se bajan, así
que la cobertura no se erosiona sin que nadie se entere.

Con una advertencia que este proyecto aprendió a golpes: **la cobertura mide
ejecución, no verificación**. `auth-token.interceptor.ts` tenía 100 % y **cero
pruebas** — se ejecutaba en todas las demás por estar en la cadena. Por eso
las ramas de los guards se prueban una a una: en código de autorización, una
rama sin comprobar es un permiso sin comprobar.

---

# Limitaciones conocidas

Lo de seguridad está en [`riesgos-conocidos.md`](riesgos-conocidos.md) — nueve
riesgos, dos de gravedad alta. Aquí, lo demás.

## L-01 · No hay backend

Es la limitación de fondo, y de ella cuelgan casi todas las demás: sin
servidor no hay autorización real (**R-02**), ni sesión en cookie segura
(**R-01**), ni límite de intentos (**R-06**).

## L-02 · Los datos no sobreviven a una recarga

El estado vive en memoria del interceptor simulado. Al recargar, vuelve al
juego de datos inicial. Es coherente con lo que es el proyecto: no se añadió
persistencia falsa para no fingir un comportamiento que el backend real no
tendría por qué tener.

## L-03 · Sin internacionalización

La interfaz está solo en español, con textos escritos en las plantillas. El
`LOCALE_ID` sí está puesto, así que fechas y números ya se formatean bien.
Traducir exigiría extraer los textos con `@angular/localize`.

## L-04 · Accesibilidad revisada, no auditada

Se cuidó lo que se fue tocando: HTML semántico, etiquetas en los campos,
`aria-label` en los botones de solo icono, foco atrapado en el modal, y el
linter de accesibilidad de plantillas en verde. **No** ha pasado por una
auditoría con lector de pantalla ni por una revisión de contraste completa,
que es lo que haría falta para afirmar que cumple WCAG.

## L-05 · Sin pruebas de extremo a extremo

Hay 34 archivos de pruebas —unitarias y de integración, incluida la cadena
HTTP completa— pero ninguna que recorra la aplicación en un navegador real de
principio a fin. Sería el siguiente paso natural con Playwright o Cypress.

Los recorridos que sí se verificaron a mano en el navegador están anotados en
[`guia-de-pruebas.md`](guia-de-pruebas.md). Y conviene decirlo: **el navegador
encontró fallos que las pruebas no vieron** — el desplegable de categoría en
blanco al restaurar desde la URL (Día 22) es el ejemplo claro.

## L-06 · Sin observabilidad en producción

No hay envío de errores a ningún servicio. `AppHttpError` ya lleva el
`correlationId`, así que el sitio donde engancharlo está identificado: el
interceptor de errores.

## L-07 · El paquete no se vigila solo

No hay presupuestos de tamaño configurados ni análisis del paquete en
integración continua. Hoy el tamaño es razonable, pero nada avisaría si
creciera.
