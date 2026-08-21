# Riesgos conocidos

> Entregable del Día 28. Lista de lo que **no** está resuelto en esta
> aplicación, con su motivo y qué haría falta para cerrarlo.
>
> Es un proyecto formativo con backend simulado: varias cosas están
> deliberadamente sin hacer. Lo que no vale es no saber cuáles.

Última revisión: 21 de agosto de 2026.

## Cómo leer la tabla

| Gravedad | Significa |
|---|---|
| **Alta** | Explotable si esto saliera a producción tal cual |
| **Media** | Depende del contexto o exige otra condición previa |
| **Baja** | Limitación asumida, sin efecto en seguridad |

---

## R-01 · El token vive en `sessionStorage` — **Alta**

**Dónde**: [`auth-service.ts`](../src/app/core/services/auth-service.ts)

Cualquier script que se ejecute en la página puede leerlo. Si algún día
entrara código de terceros (una librería comprometida, un anuncio, una
extensión), podría robar la sesión.

**Por qué está así**: el token es falso y la sesión se simula en el cliente.

**Cómo se cierra**: cookie `HttpOnly` + `Secure` + `SameSite=Strict` emitida
por el servidor. El JavaScript no puede leerla, así que el robo por XSS deja
de ser posible. Requiere backend real.

---

## R-02 · La autorización solo se comprueba en el cliente — **Alta**

**Dónde**: [`role-guard.ts`](../src/app/core/guards/role-guard.ts) y los
`@if` de las plantillas.

Los guards impiden **navegar**, no impiden **pedir**. Con las herramientas
del navegador se puede llamar a la API sin pasar por ninguna pantalla.

**Por qué está así**: no hay servidor que valide nada.

**Cómo se cierra**: el backend vuelve a comprobar permisos en **cada**
petición. La regla: lo del cliente es comodidad; la barrera está en el
servidor. Ya quedó anotado el Día 20.

---

## R-03 · Credenciales de demostración en el código — **Media**

**Dónde**: [`fake-backend.interceptor.ts`](../src/app/core/api/fake-backend.interceptor.ts),
constante `DEMO_PASSWORD`, y visibles en la pantalla de acceso.

Es la única credencial del repositorio y es intencionada: sin ella nadie
podría probar la aplicación. Pero es un patrón que **no debe imitarse** —
una contraseña real ahí quedaría en el historial de git para siempre.

**Cómo se cierra**: desaparece con el backend simulado. Para entonces, las
credenciales de prueba van en un gestor de secretos, nunca en el repositorio.

---

## R-04 · Sin protección CSRF — **Media**

No hay token anti-CSRF en las peticiones que modifican datos.

**Por qué está así**: hoy la autenticación es por cabecera `Authorization`,
que no se envía sola desde otro sitio, así que CSRF no aplica.

**Cuándo pasa a ser urgente**: **en cuanto se cambie a cookies (R-01)**. Las
cookies sí viajan solas y ahí sí hace falta. Angular trae
`withXsrfConfiguration()` para ello. Los dos riesgos hay que resolverlos a
la vez.

---

## R-05 · Sin cabeceras de seguridad ni CSP — **Media**

No hay `Content-Security-Policy`, `X-Frame-Options` ni
`Strict-Transport-Security`.

**Por qué está así**: son cabeceras que emite el **servidor**, no la
aplicación; y hasta ahora no había despliegue.

**Cómo se cierra**: configurarlas en el servidor o el CDN que sirva los
archivos. Una CSP también acota el daño de un XSS, así que refuerza R-01.

---

## R-06 · Sin límite de intentos de acceso — **Media**

Se puede probar contraseñas sin restricción.

**Cómo se cierra**: limitar por IP y por cuenta en el servidor, con espera
creciente. No se puede hacer solo en el cliente: quien ataca no usa la
interfaz.

---

## R-07 · El tipado de las respuestas no valida nada — **Baja**

**Dónde**: [`incident-api.ts`](../src/app/core/api/incident-api.ts)

`this.http.get<Incident[]>(...)` es una promesa al compilador, no una
comprobación. Si el servidor devuelve otra cosa, TypeScript no se entera y
el fallo aparece más tarde y más lejos.

**Cómo se cierra**: validar el esquema en la frontera (Zod o similar). Ya
quedó anotado el Día 15.

---

## R-08 · La sesión no caduca sola durante el uso — **Baja**

La caducidad se comprueba **al arrancar**. Si alguien deja la aplicación
abierta ocho horas, la sesión sigue activa en el cliente hasta que recargue.

**Cómo se cierra**: el servidor rechaza el token caducado con un 401, y el
interceptor de errores del Día 18 ya está en el sitio adecuado para
reaccionar cerrando la sesión.

---

## R-09 · Toda la aplicación depende de un backend simulado — **Baja**

Es la limitación de fondo del proyecto. Está aislada a propósito en un solo
archivo y detrás de una bandera de entorno (`useFakeBackend`), así que
quitarla es cambiar una configuración, no reescribir código.

---

## Lo que sí está resuelto

No todo son pendientes. Comprobado en la auditoría de hoy:

| Comprobación | Resultado |
|---|---|
| HTML dinámico (`innerHTML`, `bypassSecurityTrust`) | **ninguno** — sin superficie de XSS propia |
| Secretos en el repositorio | solo la contraseña de demostración (R-03) |
| Vulnerabilidades en dependencias | **0** tras actualizar a Angular 20.3.29 |
| Errores de lint | **0** |
| URLs por ambiente | separadas en `src/environments/` |

Sobre las dependencias: la auditoría encontró **6 vulnerabilidades altas**,
entre ellas un XSS por atributos de manejador de eventos en i18n
([GHSA-jj27-h5hq-8x99](https://github.com/advisories/GHSA-jj27-h5hq-8x99)).
Se corrigieron actualizando de 20.3.26 a **20.3.29**, y las 454 pruebas
siguieron pasando.

## Cómo repetir esta auditoría

```bash
npm audit                              # dependencias
npx ng lint                            # calidad de código
grep -rn "innerHTML\|bypassSecurityTrust" src/     # HTML dinámico
grep -rnEi "(api[_-]?key|secret|password)\s*[:=]\s*['\"]" src/   # secretos
```

Conviene rehacerla al menos cada vez que se toquen dependencias.
