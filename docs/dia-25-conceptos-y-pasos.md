# Día 25 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **pruebas HTTP, routing e interceptores.**

## 1. Punto de partida: qué había y qué faltaba

Igual que el Día 24, buena parte del trabajo ya existía. La auditoría, una
actividad a la vez:

| Actividad | Estado |
|---|---|
| 1. Consulta de incidencias | ya, en `incident-api.spec.ts` |
| 2. Creación mediante HTTP | ya, en `incident-api.spec.ts` |
| 3. Respuestas 404 y 500 | **a medias** |
| 4. Guard de autenticación | ya, en `guards.spec.ts` |
| 5. Autorización por rol | ya, en `guards.spec.ts` y `app.routes.spec.ts` |
| 6. Encabezado del interceptor | **el de correlación sí; el del token, no** |

Los dos huecos resultaron ser los interesantes.

## 2. El hallazgo del día: cobertura no es verificación

Al buscar qué faltaba probar apareció esto:

```
core/http/auth-token.interceptor.ts    sentencias 100%   ramas 3/3
```

Cobertura perfecta. Y **cero pruebas**.

La explicación es sencilla: ese interceptor está en la cadena que usa
`provideTestApi()`, así que **se ejecutaba en cada una de las 400 pruebas**
del proyecto. Ejecutarse cuenta como cobertura. Pero ninguna comprobaba que
adjuntara el token, ni que lo omitiera en el inicio de sesión, ni que
dejara de mandarlo al cerrar sesión.

Un interceptor que no adjuntara nada habría dado exactamente el mismo
100 %.

Es la advertencia del Día 24 llevada a su caso extremo:

> La cobertura dice qué líneas **se ejecutan**, no si lo que hacen es
> correcto.

Y explica algo que al principio despista: tras añadir nueve pruebas hoy, la
cobertura global **no se movió** (95,74 % / 86,69 %, idénticos). No se
cubrió código nuevo; se verificó código que ya se ejecutaba.

## 3. Conceptos del día

### Probar la cadena, no solo las piezas

Ya había specs de `IncidentApi` (¿construye bien la petición?) y de cada
interceptor por separado (¿traduce bien este error?). Lo que faltaba era el
camino completo:

```
IncidentStore → IncidentApi → interceptores → backend simulado
```

Ahí es donde aparecen los fallos de **montaje**, que ninguna prueba aislada
puede ver: un interceptor en el orden equivocado, un error que llega sin
traducir, una cabecera que se pierde por el camino.

Por eso el spec nuevo comprueba, por ejemplo, que un 404 llega hasta el
store convertido en mensaje legible **y** queda registrado en `store.error()`.

### Dos formas de probar HTTP, y cuándo usar cada una

El spec nuevo usa las dos a propósito:

| Herramienta | Para qué | Aquí |
|---|---|---|
| Backend simulado | comportamiento de extremo a extremo | «un 404 llega al store con mensaje legible» |
| `HttpTestingController` | inspeccionar la petición emitida | «la petición lleva `Authorization: Bearer …`» |

Para comprobar cabeceras hace falta la segunda: son un detalle de la
petición, y el backend simulado no las devuelve.

### Un test que me corrigió

Escribí esta aserción dando por hecho que el error que llega arriba no
conserva el código HTTP:

```ts
expect((failure as { status?: number }).status).toBeUndefined();   // ❌
```

Falló: `AppHttpError` **sí** expone `status` y `correlationId`, y lo hace a
propósito desde el Día 18 — para que soporte pueda cruzar un fallo con los
registros del servidor. Lo que no expone es un `HttpErrorResponse`.

La prueba quedó afirmando lo correcto: es un `Error` corriente con el
mensaje ya traducido, que **además** conserva el código como metadato sin
que nadie tenga que interpretarlo para mostrar el fallo.

Van varias veces en el reto: cuando una prueba nueva se pone en rojo, lo
primero es preguntarse si la equivocada es la prueba.

## 4. Paso a paso — cómo lo hicimos

1. **Auditar** las seis actividades contra los specs existentes.
2. **Crear
   [`http-integration.spec.ts`](../src/app/core/http/http-integration.spec.ts)**
   con dos bloques:

   - **Contra el backend simulado**: consulta, creación con persistencia
     comprobada recargando, un 404 que llega traducido al store y un 500 que
     deja el indicador de carga apagado y el contador a cero.
   - **Cabeceras**, con `HttpTestingController`: sin sesión no se manda
     `Authorization`; con sesión va en todas; el inicio de sesión se
     exceptúa —pedir un token con un token no tiene sentido—; tras cerrar
     sesión deja de mandarse; y la correlación viaja junto al token sin que
     una pise a la otra.

3. **Verificar**:

   ```bash
   npm run test:coverage    # 431 SUCCESS
   ```

4. **Commit** con el mensaje sugerido por el reto:

   ```bash
   git commit -m "test(http): cover API services guards and interceptors"
   ```

## 5. Resultado

| | Antes | Después |
|---|---|---|
| Pruebas | 422 | **431** |
| Cobertura | 95,74 % / 86,69 % | **igual** |

Que la cobertura no se moviera es, esta vez, el dato más informativo del
día: nueve pruebas nuevas sobre código que ya estaba al 100 %.

- La cadena HTTP completa probada de extremo a extremo, no solo pieza a
  pieza.
- `authTokenInterceptor` verificado por fin: cinco pruebas sobre el
  comportamiento que ninguna medición podía detectar que faltaba.
- Los 404 y 500 comprobados donde importa: llegando al store con mensaje
  legible y sin dejar la interfaz cargando.
