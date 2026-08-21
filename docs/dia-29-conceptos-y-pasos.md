# Día 29 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **documentación, compilación y despliegue.**
>
> Entregables: [`arquitectura.md`](arquitectura.md),
> [`decisiones-tecnicas.md`](decisiones-tecnicas.md) y el
> [`README.md`](../README.md) completo.

## 1. La compilación de producción, y por qué no es «lo mismo pero comprimido»

`ng build` no es `ng serve` con menos espacios. Hace cosas distintas:

| Qué hace | Para qué |
|---|---|
| **Sustituye archivos** (`fileReplacements`) | entra `environment.production.ts`, y con él `useFakeBackend: false` |
| **Elimina código muerto** (*tree shaking*) | lo que no se importa no viaja |
| **Pone un hash en cada nombre** | `main-3KJGTUOQ.js` se puede cachear para siempre: si cambia, cambia el nombre |
| **Parte el código** | cada ruta diferida sale en su propio archivo |

El resultado de hoy, sin advertencias:

```
Initial chunk files    Raw size    Transfer size
──────────────────────────────────────────────────
                       ~340 kB        ~98 kB
```

**La cifra que importa es la de la derecha.** Es la que se descarga de verdad,
ya comprimida. Fijarse en el tamaño en crudo lleva a preocuparse por un número
que nadie llega a transferir.

## 2. El concepto central del día: por qué una SPA se rompe al recargar

Esto es lo más importante del Día 29, y es fácil no verlo hasta que pasa en
producción.

Cuando se navega **dentro** de la aplicación a `/incidents/inc-003`, el
servidor no se entera de nada: el enrutador de Angular cambia la URL con la
API de historial del navegador y pinta el componente. No hay petición.

Pero si alguien **recarga** esa página, o pega el enlace en otra pestaña, el
navegador sí pide `/incidents/inc-003` al servidor. Y ahí no hay ninguna
carpeta `incidents` con un archivo `inc-003`. **404.**

```
Navegar dentro:   [Angular] cambia la URL ....... funciona
Recargar:         [Navegador] → GET /incidents/inc-003 → [Servidor] → 404 💥
```

La solución es una regla de una línea: **todo lo que no sea un archivo real,
respóndelo con `index.html`**. Angular arranca, mira la URL y resuelve la ruta.

```
/*    /index.html   200
```

Dos detalles que la gente se salta:

- **200, no 301.** Es una *reescritura*, no una *redirección*. Con un 301 el
  navegador cambiaría la barra de direcciones a `/` y se perdería la ruta.
- **Solo si el archivo no existe.** Si `main-3KJGTUOQ.js` cayera en esta regla,
  el navegador recibiría HTML donde espera JavaScript y la aplicación no
  arrancaría.

Se comprobó sirviendo el build de verdad:

| Ruta | Respuesta |
|---|---|
| `/`, `/dashboard`, `/incidents` | 200 · `index.html` |
| `/incidents/inc-003/edit` | 200 · `index.html` ← la profunda, la que falla sin la regla |
| `/main-3KJGTUOQ.js` | 200 · `text/javascript` ← se sigue sirviendo como archivo |

## 3. Las cabeceras las pone el servidor

Aprovechando que había que configurar el despliegue, se cerró el riesgo
**R-05** de la lista del Día 28. Con una idea detrás: `Content-Security-Policy`
y compañía **no son cosa de la aplicación**. Angular no puede emitirlas; las
emite quien sirve los archivos. Por eso viven en `netlify.toml` y
`vercel.json`, no en el código.

La CSP es la interesante: acota el daño de un XSS. Si alguien lograra inyectar
un `<script src="https://sitio-malo/">`, el navegador se negaría a cargarlo
porque `default-src 'self'` solo permite este origen.

`style-src` necesita `'unsafe-inline'` porque Angular inserta los estilos de
componente en línea. Merece la pena saberlo en vez de descubrirlo cuando la
aplicación aparezca sin estilos en producción.

Y la caché, que va de la mano del hash de los nombres:

| Archivo | Caché | Por qué |
|---|---|---|
| `*.js`, `*.css` | un año, inmutable | el nombre lleva hash: si cambia el contenido, cambia el nombre |
| `index.html` | `no-cache` | es quien apunta a los demás; si se cacheara, se seguirían pidiendo los viejos |

## 4. Documentar decisiones, no funcionamiento

El código ya dice **qué** hace. Lo que no dice —y se pierde en semanas— es
**por qué se eligió eso y no lo otro**.

Por eso `decisiones-tecnicas.md` tiene diez entradas y todas llevan
**la alternativa descartada**:

> **D-02 · Store propio de señales, sin NgRx**
> *Alternativa descartada*: NgRx, o `@ngrx/signals`.
> …
> *Cuándo reconsiderarlo*: cuando haya varias entidades relacionadas que se
> invaliden entre sí.

Ese último campo es el que convierte el documento en algo vivo. Sin él, una
decisión razonable de hoy se lee dentro de un año como un dogma que nadie se
atreve a tocar. Con él, hay un criterio para saber cuándo toca cambiarla.

**Una decisión sin alternativa descartada no es una decisión: es una
costumbre.**

## 5. Diagramas en Mermaid

Los diagramas de `arquitectura.md` son texto, no imágenes. Eso importa:

- **Se versionan**: el diff de un diagrama se lee, y se revisa en un PR.
- **No se quedan viejos en silencio**: actualizar tres líneas es fácil; volver
  a exportar un PNG desde una herramienta que ya nadie tiene, no.
- GitHub y VS Code los dibujan sin instalar nada.

Cuatro vistas, cada una respondiendo una pregunta distinta:

1. **Capas** — ¿quién puede depender de quién?
2. **Secuencia** — ¿qué recorre un dato desde el clic hasta la pantalla?
3. **Store** — ¿quién puede escribir el estado?
4. **Interceptores y rutas** — ¿en qué orden pasa todo, y qué protege qué?

## 6. Decir lo que no está hecho

`decisiones-tecnicas.md` termina con siete limitaciones (L-01 a L-07): sin
backend, sin persistencia, sin internacionalización, sin auditoría de
accesibilidad, sin pruebas de extremo a extremo, sin observabilidad, sin
vigilancia del tamaño del paquete.

Escribirlas cuesta poco y evita dos cosas: que alguien crea que la aplicación
hace algo que no hace, y que se pierda el tiempo buscando una funcionalidad
que nunca se implementó.

En L-05 quedó anotado algo que este reto repitió varias veces: **el navegador
encontró fallos que las 454 pruebas no vieron**. El desplegable de categoría
en blanco al restaurar desde la URL (Día 22) es el ejemplo. Por eso «hay
pruebas» no equivale a «está verificado».

## 7. Paso a paso — cómo lo hicimos

1. **Compilar en producción** y revisar advertencias: ninguna.
2. **Configurar el despliegue**: `_redirects`, `netlify.toml` y `vercel.json`,
   con las rutas de la SPA, las cabeceras de seguridad y la caché.
3. **Verificar el reenvío de rutas de verdad**, sirviendo el build y pidiendo
   siete rutas con `curl` — incluida una profunda y un archivo real, para
   comprobar que la regla no se lo traga.
4. **Arreglar el `index.html`**: título de verdad en vez de
   `IncidentManagement`, `lang="es"` (los lectores de pantalla eligen la voz
   con eso) y una descripción.
5. **Fijar el puerto 4300** en el script `start`, que es el que se usa de
   hecho.
6. **Escribir el README**: arranque, credenciales, comandos, estructura,
   despliegue para cuatro servidores y estado del proyecto.
7. **Dibujar la arquitectura** en cuatro diagramas Mermaid.
8. **Escribir las decisiones técnicas** (10, con alternativa descartada) y las
   limitaciones (7).
9. **Commit** con el mensaje sugerido:

   ```bash
   git commit -m "docs(project): complete deployment and technical documentation"
   ```

## 8. Sobre el despliegue en sí

La aplicación **queda lista para desplegar y verificada localmente**, pero no
se ha publicado en ningún servicio: eso exige elegir plataforma y usar una
cuenta, y es una decisión que no me corresponde tomar. Con la configuración ya
en el repositorio, publicar es conectar el repositorio a Netlify o Vercel —
ambos leen su archivo y no hace falta configurar nada por pantalla— o subir el
contenido de `dist/incident-management/browser/` a cualquier servidor con el
reenvío de rutas puesto.

## 9. Resultado

| | Antes | Después |
|---|---|---|
| Advertencias de compilación | — | **0** |
| Rutas de la SPA | sin configurar | 4 servidores documentados, **verificado con `curl`** |
| Cabeceras de seguridad (R-05) | ninguna | CSP, HSTS, X-Frame-Options, Referrer-Policy |
| Título de la página | `IncidentManagement` | «Gestión de incidencias», `lang="es"` |
| README | 31 líneas | completo, con despliegue y credenciales |
| Diagramas | 0 | **4**, en texto versionable |
| Decisiones documentadas | dispersas por los días | **10**, con alternativa descartada |
| Limitaciones | implícitas | **7**, por escrito |
