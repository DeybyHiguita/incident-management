# Día 19 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **autenticación simulada.**

## 1. Conceptos del día

### El servicio de autenticación

[`AuthService`](../src/app/core/services/auth-service.ts) es el único punto
que sabe si hay alguien dentro y quién es. Expone tres señales derivadas de
una sesión privada:

```ts
private readonly session = signal<Session | null>(this.restoreSession());

readonly currentUser = computed(() => this.session()?.user ?? null);
readonly token = computed(() => this.session()?.token ?? null);
readonly isAuthenticated = computed(() => this.session() !== null);
```

Es el mismo patrón que `IncidentService` desde el Día 9: estado privado,
lectura pública, y toda escritura pasando por un método. Nadie puede
«ponerse» autenticado desde fuera; hay que iniciar sesión.

### Token y usuario en la respuesta

La API simulada responde como lo haría una real:

```json
{ "token": "fake-token…", "user": { … }, "expiresAt": 1786… }
```

Devolver el usuario junto al token evita una segunda petición para saber
quién ha entrado. Y `expiresAt` permite descartar sesiones viejas sin
preguntar al servidor.

Un detalle de seguridad que sí aplica aunque sea simulado: cuando el correo
no existe y cuando la contraseña es incorrecta, **el mensaje es el mismo**
(«Correo o contraseña incorrectos»). Mensajes distintos permitirían
averiguar qué correos están registrados probando uno a uno.

### Mantener la sesión entre recargas

La sesión se guarda en `sessionStorage` y se recupera al construir el
servicio, así que recargar la página no echa al usuario. Al restaurarla se
descarta lo guardado si está **caducado o corrupto**:

```ts
if (!session?.token || !session?.user || session.expiresAt <= Date.now()) {
  this.storage?.removeItem(STORAGE_KEY);
  return null;
}
```

Ese `try/catch` alrededor del `JSON.parse` no es paranoia: el
almacenamiento del navegador lo puede tocar cualquiera, y arrancar con una
sesión inválida es peor que pedir el inicio de sesión otra vez.

`sessionStorage` (y no `localStorage`) porque la sesión muere al cerrar la
pestaña, que es lo razonable para una herramienta de trabajo compartida.

> Advertencia honesta: guardar un token en el almacenamiento del navegador
> lo deja al alcance de cualquier script de la página. En una aplicación
> real con datos sensibles, la opción segura es una cookie `HttpOnly`, que
> el JavaScript no puede leer. Aquí es aceptable porque el token es falso.

### El token viaja solo

[`authTokenInterceptor`](../src/app/core/http/auth-token.interceptor.ts)
añade la cabecera `Authorization` a cada petición, siguiendo el mismo
argumento del Día 18: ni los servicios ni los componentes deben acordarse de
mandar la credencial.

```ts
if (!token || request.url.startsWith('/api/auth/')) {
  return next(request);
}
return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
```

El inicio de sesión se excluye: pedir un token con un token sería absurdo, y
es justo la petición que se hace cuando no hay ninguno.

### El guard y el `returnUrl`

Una autenticación que no protege nada es decorativa, así que se añadió un
[`authGuard`](../src/app/core/guards/auth-guard.ts). Devuelve `true` o un
`UrlTree` de redirección:

```ts
return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
```

El `returnUrl` es el detalle que separa una redirección útil de una molesta:
quien intentaba abrir `/incidents/inc-003` acaba ahí después de entrar, no
en el panel. Se comprueba en el navegador:

```
/incidents/inc-003  →  /login?returnUrl=%2Fincidents%2Finc-003  →  (entrar)  →  /incidents/inc-003
```

Además, al aplicarse sobre la ruta con `loadChildren`, **el guard corre
antes de descargar el fragmento**: sin sesión no se descarga ni el código de
incidencias.

### La cabecera

Muestra el nombre, el correo y el rol de quien ha entrado, y el botón de
cerrar sesión. Sin sesión no muestra ni la navegación ni los datos: no tiene
sentido ofrecer enlaces a sitios donde el guard va a rebotar.

`Header` dejó de recibir el usuario como `@Input` desde `App` y ahora lo lee
de `AuthService`, que es quien lo sabe.

## 2. Paso a paso — cómo lo hicimos

1. **Modelar** `Credentials`, `AuthResponse` y `Session`.
2. **Añadir el extremo `/api/auth/login`** al backend simulado, con
   contraseña de demostración y respuesta con token, usuario y caducidad.
3. **Crear `AuthService`** con las señales, el inicio y cierre de sesión y
   la persistencia defensiva.
4. **Crear la pantalla de inicio de sesión** con formulario reactivo tipado,
   validaciones y el mensaje del servidor cuando las credenciales fallan
   —que llega ya traducido por el interceptor del Día 18—.
5. **Crear `authTokenInterceptor`** y añadirlo a la cadena, después del de
   correlación.
6. **Crear `authGuard`** y proteger `/dashboard` y `/incidents`, dejando
   `/login` pública.
7. **Actualizar la cabecera** para mostrar la sesión y permitir cerrarla.
8. **Pruebas** (35 nuevas): del servicio (token y usuario, credenciales
   incorrectas, persistencia, sesión caducada, sesión corrupta, cierre), de
   la pantalla (validación, error del servidor, reintento) y del guard
   (redirección, `returnUrl`, ruta pública, y que todo lo privado lo
   declare).
9. **Verificar el flujo en el navegador**:

   | Paso | Resultado |
   |---|---|
   | Abrir `/incidents/inc-003` sin sesión | `/login?returnUrl=%2Fincidents%2Finc-003` |
   | Contraseña incorrecta | «Correo o contraseña incorrectos.» |
   | Credenciales correctas | vuelve a `/incidents/inc-003`, cabecera con «Ana Torres» |
   | Recargar la página | sigue dentro, en la misma ruta |
   | Cerrar sesión | `/login`, sin navegación visible |

   ```bash
   ng build                                          # sin errores
   ng test --watch=false --browsers=ChromeHeadless   # 311 SUCCESS
   ```

10. **Commit** con el mensaje sugerido por el reto:

    ```bash
    git commit -m "feat(auth): implement simulated authentication flow"
    ```

## 3. Un problema de pruebas que valía la pena arreglar bien

Al proteger las rutas, el spec de enrutamiento empezó a fallar **de forma
intermitente**: unas veces pasaba y otras no, sin tocar nada.

La causa: usaba `fakeAsync` con `tick()`, pero los `import()` de la carga
diferida son **promesas reales** que `tick()` no puede adelantar. El
resultado dependía de si otro test había cargado antes ese fragmento, y
Karma ejecuta en orden aleatorio.

Se reescribió el spec entero con `async`/`await` sobre navegaciones reales.
Un test inestable es peor que no tenerlo: enseña a ignorar los fallos. Se
comprobó ejecutando la batería tres veces seguidas, con 311 en verde las
tres.

De paso, otro test reveló algo del enrutador que conviene saber: **navegar a
la URL en la que ya estás no dispara una navegación**, así que el guard ni
se ejecuta. La prueba de «tras cerrar sesión» tuvo que ir a una ruta
distinta para ser válida.

## 4. Resultado

- Inicio y cierre de sesión funcionando, con token y usuario simulados.
- Sesión que sobrevive a recargas y se descarta sola si caduca o se corrompe.
- Token adjuntado automáticamente por un interceptor.
- Rutas privadas protegidas, con vuelta al destino original tras entrar.
- 311 pruebas en verde (276 anteriores + 35 nuevas), estables.
