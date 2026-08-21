# Gestión de incidencias

Aplicación de gestión de incidencias técnicas construida con **Angular 20**
como resultado de un reto formativo de 30 días. Registro, seguimiento,
filtrado y resolución de incidencias, con acceso por roles.

Es un proyecto de aprendizaje: funciona de principio a fin, pero el backend
está simulado. Lo que eso implica está escrito, sin adornos, en
[limitaciones conocidas](docs/decisiones-tecnicas.md#limitaciones-conocidas) y
[riesgos conocidos](docs/riesgos-conocidos.md).

---

## Empezar

```bash
npm install
npm start
```

La aplicación queda en **http://localhost:4300/**.

> El puerto por defecto de Angular es el 4200; aquí se usa el **4300** porque
> el 4200 suele estar ocupado por otro proyecto en la máquina de desarrollo.
> Se cambia en el script `start` del `package.json`.

### Entrar

Cualquiera de estas cuentas, todas con la contraseña **`angular20`**:

| Correo | Rol | Qué puede hacer |
|---|---|---|
| `ana.torres@example.com` | **ADMIN** | todo, incluido el panel de administración |
| `luis.gomez@example.com` | **AGENT** | gestionar incidencias, sin administrar |
| `carlos.pena@example.com` | **REQUESTER** | registrar y consultar las suyas |

Las credenciales están a la vista en la propia pantalla de acceso. Son de
demostración y **están en el código a propósito** (riesgo R-03): sin ellas
nadie podría probar la aplicación. Es un patrón que no debe imitarse con
credenciales reales.

### Requisitos

Node.js **22.22.1** o compatible, y npm **10.9.4** o compatible. El Angular
CLI viene en las dependencias del proyecto: no hace falta instalarlo aparte.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm start` | servidor de desarrollo con recarga automática, en el puerto 4300 |
| `npm run build` | compila para producción en `dist/incident-management/browser/` |
| `npm test` | pruebas en modo vigilancia, con navegador abierto |
| `npm run test:ci` | pruebas una vez, sin ventana — **454 pruebas** |
| `npm run test:coverage` | pruebas con informe de cobertura en `coverage/` |
| `npm run lint` | análisis estático con `angular-eslint` |

La compilación de producción sustituye `src/environments/environment.ts` por
`environment.production.ts`, lo que entre otras cosas **deja fuera el backend
simulado**.

---

## Qué hace la aplicación

- **Incidencias**: registrar, editar, ver el detalle y eliminar con
  confirmación.
- **Búsqueda y filtros** por texto, estado, prioridad y categoría, con la
  búsqueda amortiguada para no pedir en cada tecla.
- **Los filtros viven en la URL**: se puede compartir o guardar una vista
  filtrada, y sobrevive a una recarga.
- **Resumen** con el recuento por estado y por prioridad.
- **Acceso por roles** con guards en las rutas, y un `returnUrl` que devuelve
  a donde se quería ir tras iniciar sesión.
- **Errores tratados en un solo sitio**, con un identificador de rastreo en
  cada petición.

---

## Cómo está organizado

```
src/app/
├── core/          estado, datos y reglas — no depende de nada de features/
│   ├── api/       IncidentApi + el backend simulado (un interceptor)
│   ├── guards/    authGuard · roleGuard
│   ├── http/      4 interceptores: rastreo · token · carga · errores
│   ├── models/    tipos del dominio
│   ├── services/  Auth · User · Loading
│   └── state/     IncidentStore (señales)
├── features/      una carpeta por pantalla, todas con carga diferida
│   ├── auth/  dashboard/  incidents/  admin/
├── layout/        cabecera y pie
├── shared/        piezas reutilizables, sin reglas de negocio
│   ├── components/  directives/  pipes/  validators/  pages/
└── testing/       utilidades comunes de las pruebas
```

**La regla que lo sostiene**: las dependencias apuntan hacia adentro. Una
funcionalidad usa `core` y `shared`; `core` no sabe que las funcionalidades
existen. Los diagramas están en [`docs/arquitectura.md`](docs/arquitectura.md).

En números: 21 componentes, 5 servicios y stores, 2 directivas, 2 pipes y 34
archivos de pruebas.

---

## Pruebas

```bash
npm run test:ci        # 454 pruebas
npm run test:coverage  # informe en coverage/
```

Los umbrales de cobertura (**90 %** líneas y funciones, **80 %** ramas) están
configurados en `karma.conf.js` y **hacen fallar la ejecución** si se bajan.

Con una advertencia que conviene tener presente: la cobertura mide ejecución,
no verificación. Este proyecto se encontró un interceptor con 100 % de
cobertura y **cero pruebas propias** — se ejecutaba en todas las demás por
estar en la cadena HTTP. El detalle está en
[`docs/guia-de-pruebas.md`](docs/guia-de-pruebas.md).

---

## Despliegue

La compilación genera archivos estáticos: sirve cualquier hosting estático.

```bash
npm run build     # → dist/incident-management/browser/
```

**Lo único que hay que configurar es el reenvío de rutas.** El enrutador vive
en el navegador: el servidor no conoce `/incidents/inc-003`, así que sin esta
regla recargar esa dirección devolvería un 404. Todo lo que no sea un archivo
real debe responderse con `index.html`, y con un **200**, no un 301 — es una
reescritura, no una redirección.

El repositorio ya trae la configuración hecha para dos servicios:

| Servicio | Archivo | Listo |
|---|---|---|
| Netlify | [`netlify.toml`](netlify.toml) + [`public/_redirects`](public/_redirects) | rutas + cabeceras de seguridad + caché |
| Vercel | [`vercel.json`](vercel.json) | rutas + cabeceras de seguridad |

Para otros servidores:

<details>
<summary><strong>nginx</strong></summary>

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```
</details>

<details>
<summary><strong>Apache</strong> (<code>.htaccess</code>)</summary>

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```
</details>

<details>
<summary><strong>GitHub Pages</strong></summary>

No admite reescrituras. El apaño habitual es copiar `index.html` como
`404.html`. Además hay que compilar con la ruta base del repositorio:

```bash
npm run build -- --base-href /nombre-del-repositorio/
```
</details>

Las cabeceras de seguridad (`Content-Security-Policy`, `X-Frame-Options`,
`Strict-Transport-Security`) van en esa misma configuración porque **las
emite el servidor, no la aplicación**. Es lo que cierra el riesgo R-05.

---

## Documentación

| Documento | Contenido |
|---|---|
| [Arquitectura](docs/arquitectura.md) | diagramas de capas, flujo de datos, estado, interceptores y rutas |
| [Decisiones técnicas](docs/decisiones-tecnicas.md) | 10 decisiones con su alternativa descartada, y 7 limitaciones |
| [Riesgos conocidos](docs/riesgos-conocidos.md) | 9 riesgos de seguridad con su plan de cierre |
| [Guía de pruebas](docs/guia-de-pruebas.md) | cómo se prueba cada tipo de pieza |
| [Conceptos por día](docs/) | `dia-NN-conceptos-y-pasos.md`, uno por jornada del reto |

El plan completo del reto está en [`../PLAN.md`](../PLAN.md).

---

## Estado del proyecto

| | |
|---|---|
| Angular | 20.3.29 |
| Pruebas | 454, todas en verde |
| Vulnerabilidades | 0 |
| Errores de lint | 0 |
| Advertencias de compilación | 0 |
| Paquete inicial | ~340 kB en crudo · **~98 kB transferidos** |
