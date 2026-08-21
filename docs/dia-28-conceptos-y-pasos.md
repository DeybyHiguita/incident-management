# Día 28 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **seguridad, configuración y calidad de código.**
>
> El entregable principal es la lista de riesgos:
> [`riesgos-conocidos.md`](riesgos-conocidos.md).

## 1. La auditoría, con datos

El día empieza mirando, no cambiando. Cinco comprobaciones:

| Qué | Resultado inicial |
|---|---|
| Archivos de entorno | **no existían** |
| URLs de la API | repartidas por 5 archivos |
| HTML dinámico (`innerHTML`, `bypassSecurityTrust`) | **ninguno** ✅ |
| Linter | **no configurado** |
| Vulnerabilidades en dependencias | **6 altas** |

## 2. Lo que encontró la auditoría de dependencias

`npm audit` reveló seis vulnerabilidades altas, todas en Angular. La más
seria:

```
Angular i18n: Cross-Site Scripting (XSS) via event-handler attributes
rango vulnerable: >=20.0.0-next.0 <20.3.27
```

El proyecto estaba en **20.3.26**: una versión por debajo del parche.

Detalle práctico: **`npm audit fix` no lo resolvió**. Los paquetes de
Angular se declaran entre sí con versión exacta (`@angular/core@"20.3.26"`),
así que actualizar uno solo rompe la resolución. La herramienta que sí sabe
hacerlo es la oficial:

```bash
npx ng update @angular/core@20 @angular/cli@20
```

Resultado: **20.3.29, cero vulnerabilidades y las 454 pruebas en verde**.
Esa última parte es la que convierte una actualización en algo tranquilo.

## 3. Conceptos del día

### Configuración por ambiente

Angular sustituye archivos al compilar, según la configuración:

```jsonc
"production": {
  "fileReplacements": [
    { "replace": "src/environments/environment.ts",
      "with": "src/environments/environment.production.ts" }
  ]
}
```

En desarrollo se usa uno; en producción, el otro. El código importa siempre
el mismo `environment` y no se entera.

Con esto, las URLs dejaron de estar repartidas:

```ts
const BASE_URL = `${environment.apiBaseUrl}/incidents`;
```

Y el backend simulado pasó a depender de una bandera, en vez de estar
siempre en la cadena:

```ts
...(environment.useFakeBackend ? [fakeBackendInterceptor] : []),
```

Lo que el Día 15 se anunció como «se quita una línea» ahora es «se cambia
una configuración».

### Lo que NO va en un archivo de entorno

Es el malentendido más común: **`environment.ts` no es un lugar seguro**.
Todo lo que se compila acaba en el navegador y cualquiera puede leerlo con
las herramientas de desarrollo.

| Sí | No |
|---|---|
| URLs, banderas, tiempos de espera | claves de API, contraseñas, secretos |

Una clave que hay que ocultar tiene que vivir en el servidor, punto. Si el
cliente la necesita, el diseño está mal.

Por eso `apiBaseUrl` es una **ruta relativa** también en producción: así el
mismo paquete sirve para cualquier dominio, y quien decide a dónde van las
peticiones es el servidor o un proxy. Poner un dominio ahí obligaría a
compilar una versión por entorno.

### El linter y el falso positivo justificado

Se añadió `angular-eslint`, que no estaba. Primera pasada: **6 errores**.
Cuatro triviales (imports sin usar, un tipo inferible). Los otros dos, en el
modal, son más interesantes:

```
click must be accompanied by either keyup, keydown or keypress
Elements with interaction handlers must be focusable
```

La regla es correcta **en general**: un elemento que responde al ratón debe
responder también al teclado. Pero aquí el `(click)` está en el `<dialog>`
solo para cerrar al pulsar en el fondo, y el `<dialog>` **ya se cierra con
Escape** de forma nativa (Día 23). Añadir un `tabindex` o un `keydown`
metería en el orden de tabulación un elemento que no es un control: sería
peor para quien navega con teclado.

Se silenció con la razón escrita al lado:

```html
<!-- eslint-disable @angular-eslint/template/click-events-have-key-events, … --
     El (click) del <dialog> solo sirve para cerrar al pulsar en el fondo.
     La regla exige un equivalente de teclado, y aquí ya lo hay: Escape. -->
```

Un `eslint-disable` sin explicación es deuda. Con la explicación, es una
decisión.

### La lista de riesgos: decir lo que no está hecho

El entregable del día no es una lista de cosas arregladas, sino de cosas
**que siguen abiertas**. Nueve riesgos, cada uno con dónde está, por qué
está así y qué haría falta para cerrarlo.

Dos de ellos tienen la máxima gravedad y comparten causa: no hay servidor.

- **R-01**: el token en `sessionStorage` es legible por cualquier script.
- **R-02**: la autorización solo se comprueba en el cliente. Los guards
  impiden navegar, no impiden pedir.

Y uno enseña algo que no es evidente: **R-04, la protección CSRF**. Hoy no
hace falta, porque la sesión viaja en una cabecera `Authorization` que no se
envía sola desde otro sitio. Pero **en cuanto se pase a cookies para
resolver R-01, pasa a ser urgente**, porque las cookies sí viajan solas. Son
dos riesgos que hay que resolver a la vez, y verlo ahora evita introducir un
agujero al arreglar otro.

## 4. Paso a paso — cómo lo hicimos

1. **Auditar** con búsquedas y `npm audit`, antes de tocar nada.
2. **Actualizar Angular** a 20.3.29 con `ng update`, y comprobar con la
   batería completa que nada se rompió.
3. **Crear los dos archivos de entorno** y el `fileReplacements`.
4. **Conectar el entorno** en la API, el servicio de autenticación, el
   interceptor del token y la cadena de interceptores.
5. **Añadir `angular-eslint`** y dejar el linter en cero, con la excepción
   del modal documentada.
6. **Escribir la lista de riesgos**, con las dos comprobaciones que salieron
   bien también anotadas (sin HTML dinámico, sin secretos reales).
7. **Verificar**:

   ```bash
   npm audit                                         # 0 vulnerabilidades
   npx ng lint                                       # All files pass linting
   ng build                                          # sin errores
   ng test --watch=false --browsers=ChromeHeadless   # 454 SUCCESS
   ```

8. **Commit** con el mensaje sugerido por el reto:

   ```bash
   git commit -m "chore(security): harden environment configuration and code quality"
   ```

## 5. Resultado

| | Antes | Después |
|---|---|---|
| Vulnerabilidades | **6 altas** | **0** |
| Errores de lint | sin linter | **0** |
| Archivos de entorno | ninguno | 2, con reemplazo automático |
| URLs de la API | en 5 archivos | derivadas del entorno |
| Riesgos documentados | 0 | **9**, con su plan de cierre |

Lo más valioso del día no es lo arreglado: es saber, por escrito, qué
sigue sin estarlo y por qué.
