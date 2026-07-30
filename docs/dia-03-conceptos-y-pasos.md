# Día 3 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20. Complementa a
> [`../../PLAN.md`](../../PLAN.md).

## 1. Conceptos del día

### Decorador `@Component`

Función decoradora que marca una clase de TypeScript como un componente
Angular y le adjunta metadatos: selector, template, estilos e importaciones.
Sin `@Component`, `Header` sería una clase normal que Angular no sabría
renderizar.

```ts
@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header { /* ... */ }
```

### Selector

El nombre de etiqueta HTML que representa al componente dentro de otro
template. `app-header` y `app-footer` son los selectores de nuestros
componentes; el prefijo `app-` viene de la configuración por defecto del
proyecto (`angular.json` → `prefix`).

### Template

La vista HTML asociada al componente (`templateUrl: './header.html'`).
Define qué se renderiza y contiene los bindings hacia las propiedades y
métodos de la clase.

### Hoja de estilos

El CSS/SCSS que aplica solo a ese componente (`styleUrl: './header.scss'`).
Angular encapsula estos estilos por defecto (`ViewEncapsulation.Emulated`),
por lo que no se filtran a otros componentes — se puede ver en el HTML
renderizado el atributo `_ngcontent-*` que Angular añade a cada elemento
para aplicar ese aislamiento.

### Importaciones de componentes standalone

Un componente standalone declara explícitamente qué otros componentes,
directivas o pipes necesita en su array `imports`. `App` importa `Header` y
`Footer` para poder usarlos en su template:

```ts
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  // ...
})
export class App { /* ... */ }
```

### Interpolación

Sintaxis `{{ expresión }}` para insertar un valor de TypeScript como texto
en el template. La usamos para el título (`{{ systemTitle }}`), el nombre
de usuario (`{{ userName }}`) y el año en el footer (`{{ currentYear }}`).

### Property binding

Sintaxis `[propiedad]="expresión"` para pasar un valor de TypeScript hacia
una propiedad de un elemento HTML o hacia un `@Input()` de un componente
hijo, en un solo sentido (padre → hijo). Lo usamos de dos formas:

- Para pasar datos de `App` a `Header`:
  `<app-header [systemTitle]="systemTitle" [userName]="currentUser.name" />`
- Para reflejar el estado del signal `showUserDetails()` en un atributo
  nativo de accesibilidad: `[attr.aria-pressed]="showUserDetails()"`.

### Event binding

Sintaxis `(evento)="método()"` para ejecutar código de TypeScript cuando
ocurre un evento del DOM (hijo → padre / usuario → componente). Lo usamos
en el botón de "Ocultar/Mostrar detalles":

```html
<button type="button" (click)="toggleUserDetails()">
```

El método `toggleUserDetails()` vive en la clase `Header`, nunca lógica
directamente en el template — así se cumple el criterio de aceptación "los
eventos se gestionan desde TypeScript".

## 2. Paso a paso — cómo lo hicimos

1. **Generar los componentes con Angular CLI**:

   ```bash
   ng generate component layout/header
   ng generate component layout/footer
   ```

   El CLI creó cada componente como standalone (sin necesidad de
   `standalone: true` explícito, ya es el valor por defecto en Angular 20)
   con sus 4 archivos: `.ts`, `.html`, `.scss`, `.spec.ts`.

2. **Implementar `Header`** (`layout/header/header.ts`): se agregaron dos
   `@Input()` (`systemTitle`, `userName`) y un `signal(true)` llamado
   `showUserDetails` para controlar la visibilidad de la sección de
   detalle, junto con el método `toggleUserDetails()` que invierte su
   valor.

3. **Construir el template de `Header`** (`header.html`) usando
   interpolación para el título y el nombre de usuario, property binding
   (`[attr.aria-pressed]`) para reflejar el estado del toggle, event binding
   (`(click)`) para invocar `toggleUserDetails()`, y un bloque de control de
   flujo moderno `@if (showUserDetails()) { ... }` para mostrar/ocultar la
   sección de detalle (evitando lógica compleja en el template — solo se
   evalúa el signal).

4. **Implementar `Footer`** (`layout/footer/footer.ts` y `footer.html`):
   expone `currentYear` y lo muestra por interpolación en el pie de página.

5. **Componer todo en `App`** (`app.ts`): se importaron `Header` y `Footer`
   en el array `imports`, se tomó un usuario simulado de
   `MOCK_USERS[0]` (creado el Día 2) como "sesión actual", y se reemplazó
   la plantilla de bienvenida por defecto de Angular (`app.html`) por:

   ```html
   <app-header [systemTitle]="systemTitle" [userName]="currentUser.name" />
   <main class="app-main">
     <router-outlet />
   </main>
   <app-footer />
   ```

6. **Actualizar `app.spec.ts`**: el test generado por el CLI verificaba el
   título del tutorial por defecto ("Hello, incident-management"); se
   reemplazó por dos pruebas que verifican el nuevo `<h1>` dentro del
   encabezado y la presencia del `<footer>`.

7. **Verificar la compilación**:

   ```bash
   ng build
   ```

   Sin errores.

8. **Verificar visualmente en el navegador**: se levantó `npm start` y,
   ante la falta de una herramienta de navegador interactiva en esta
   sesión, se usó Chrome en modo headless para volcar el DOM ya renderizado
   (`--headless --dump-dom`), confirmando que el encabezado, el usuario
   simulado, el botón de detalle (con `aria-pressed="true"` y su sección de
   detalle visible) y el pie de página se renderizan correctamente.

9. **Commit** con el mensaje sugerido por el propio reto:

   ```bash
   git commit -m "feat(layout): create initial standalone layout components"
   ```

## 3. Resultado

- Dos componentes de layout (`Header`, `Footer`) standalone, cada uno con
  una única responsabilidad.
- Composición visual completa: encabezado con título e interacción, área
  central con `router-outlet`, pie de página.
- Toda la lógica de interacción (toggle) vive en TypeScript, no en el HTML.
