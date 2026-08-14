# Día 20 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **guards y autorización por roles.**

## 1. Conceptos del día

### Autenticación y autorización no son lo mismo

| | Pregunta | Guard |
|---|---|---|
| **Autenticación** | ¿quién eres? | `authGuard` (Día 19) |
| **Autorización** | ¿qué puedes hacer? | `roleGuard` (hoy) |

Se puede estar autenticado y aun así no tener permiso. Por eso son dos
guards separados y no uno que lo mezcle todo.

### La factoría de guards

`roleGuard` recibe los roles permitidos y devuelve el guard. Es el mismo
patrón de `forbiddenWords` en el Día 12: una función que **produce** la
función:

```ts
canActivate: [authGuard, roleGuard('ADMIN')]
```

Los guards se ejecutan en orden y **todos** tienen que dejar pasar. Se leen
como una frase: «hay que estar autenticado y ser ADMIN».

### Dos negativas distintas

Este es el detalle que más importa del día. Cuando se deniega el acceso hay
que distinguir el motivo:

```ts
if (!authService.isAuthenticated()) {
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
}

if (authService.hasAnyRole(...roles)) {
  return true;
}

return router.createUrlTree(['/forbidden']);
```

- **Sin sesión → al inicio de sesión.** El usuario *puede* resolverlo:
  entra y sigue.
- **Con sesión pero sin permiso → a acceso denegado.** Mandarlo al login
  sería engañoso: volver a entrar con la misma cuenta no le va a dar acceso,
  y quedaría dando vueltas sin entender por qué.

La página de acceso denegado dice además **con qué cuenta y rol** ha
entrado, que es la información que necesita para saber a quién pedirle
permiso.

### Los permisos se nombran por lo que permiten

En `AuthService` los permisos no se llaman `isAdmin` ni `isAgent`, sino por
la acción que habilitan:

```ts
readonly canManageIncidents = computed(() => this.hasAnyRole('ADMIN', 'AGENT'));
readonly canAdminister = computed(() => this.hasAnyRole('ADMIN'));
```

La diferencia se nota al cambiar las reglas. Con `isAgent` repartido por
quince plantillas, añadir un rol nuevo que también pueda editar obliga a
tocarlas todas. Con `canManageIncidents`, se cambia **una línea**.

Y todo —guards e interfaz— pregunta al mismo sitio, así que no puede haber
dos reglas distintas para lo mismo.

### Ocultar en la interfaz **además** de proteger la ruta

El criterio pide ocultar las opciones no autorizadas. Conviene tener claro
qué aporta cada cosa:

| | Para qué sirve | Se puede saltar |
|---|---|---|
| Ocultar el enlace | no ofrecer una puerta cerrada | sí (escribiendo la URL) |
| Guard en la ruta | **impedir** el acceso | no |

Ocultar es cortesía, no seguridad. Un usuario puede escribir
`/admin` en la barra de direcciones, y ahí es el guard quien lo detiene. Por
eso están las dos cosas, y por eso las pruebas comprueban ambas.

> Y la advertencia de siempre: esto es protección de la **interfaz**. Un
> backend real debe volver a comprobar los permisos en cada petición, porque
> el cliente es manipulable por definición.

## 2. La matriz de permisos

Verificada en el navegador con los tres roles:

| | ADMIN | AGENT | REQUESTER |
|---|---|---|---|
| Enlace «Administración» en el menú | sí | no | no |
| Botón «Editar incidencia» | sí | sí | **no** |
| `/admin` | entra | → `/forbidden` | → `/forbidden` |
| `/incidents/:id/edit` | entra | entra | → `/forbidden` |
| Ver detalle y registrar | sí | sí | sí |

Lo que un REQUESTER sí puede hacer es lo esperable: reportar incidencias y
consultarlas. Solo se le quita modificarlas.

## 3. Paso a paso — cómo lo hicimos

1. **Añadir roles a `AuthService`**: la señal `role`, el método
   `hasAnyRole(...)` y los dos permisos con nombre de acción.
2. **Crear `roleGuard`** como factoría, con las dos negativas separadas.
3. **Crear la página de acceso denegado**, que explica el motivo y ofrece
   salidas a sitios donde el usuario sí puede entrar.
4. **Crear la página de administración de usuarios**, con una tabla
   accesible (`scope="col"`, `<caption>` y desplazamiento propio para no
   romper el diseño adaptable del Día 6).
5. **Proteger las rutas**: `/admin` con `roleGuard('ADMIN')` y
   `/incidents/:id/edit` con `roleGuard('ADMIN', 'AGENT')`.
6. **Ocultar lo no autorizado**: el enlace de administración en la cabecera
   y el botón de editar en el detalle.
7. **Pruebas** (22 nuevas): las de rutas cubren los tres roles contra las
   dos rutas protegidas y la distinción entre login y acceso denegado; las
   de interfaz, que el menú y el botón desaparecen según el rol.

   Para poder probarlo se añadió `CREDENTIALS_BY_ROLE` al helper, y
   `loginForTest('AGENT')` acepta ahora el rol.

8. **Verificar**:

   ```bash
   ng build                                          # sin errores
   ng test --watch=false --browsers=ChromeHeadless   # 333 SUCCESS
   ```

9. **Commit** con el mensaje sugerido por el reto:

   ```bash
   git commit -m "feat(auth): protect routes with authentication and role guards"
   ```

## 4. Resultado

- Autorización por roles con guards componibles, aplicados junto al de
  autenticación.
- Página de acceso denegado que explica el porqué en vez de dejar al usuario
  a oscuras.
- Los permisos viven en un solo sitio y se nombran por la acción que
  habilitan.
- Doble barrera: la interfaz no ofrece lo que no se puede usar, y el guard
  lo impide aunque se escriba la URL a mano.
- 333 pruebas en verde (311 anteriores + 22 nuevas).
