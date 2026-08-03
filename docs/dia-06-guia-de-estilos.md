# Guía básica de estilos

> Entregable del Día 6 del reto formativo de Angular 20.
> Referencia rápida para escribir estilos nuevos en este proyecto sin
> reinventar valores ni romper la consistencia visual.

## 1. Dónde vive cada cosa

| Archivo | Qué contiene | Alcance |
|---|---|---|
| [`src/styles.scss`](../src/styles.scss) | Tokens (`:root`), reset, anillo de foco, clases `.btn`, utilidades | **Global**, sin encapsular |
| [`src/styles/_breakpoints.scss`](../src/styles/_breakpoints.scss) | Puntos de corte y mixin `respond-from` | Se importa con `@use 'breakpoints'` |
| `<componente>.scss` | Todo lo específico de ese componente | **Encapsulado** en el componente |

Regla práctica: si un valor se usa en dos componentes, es un token global; si
un bloque visual solo existe dentro de un componente, se queda en su SCSS.

## 2. Tokens de diseño

Todos son *custom properties* de CSS declaradas en `:root`. Se usan con
`var(--nombre)` y **nunca** se escribe el valor literal en un componente.

### Color

| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | `#f9fafb` | Fondo de la página |
| `--color-surface` | `#ffffff` | Fondo de tarjetas y controles |
| `--color-surface-muted` | `#f1f5f9` | Fondo de hover y estados apagados |
| `--color-text` | `#111827` | Texto principal |
| `--color-text-muted` | `#4b5563` | Texto secundario (descripciones, metadatos) |
| `--color-text-subtle` | `#5f6874` | Texto de controles deshabilitados |
| `--color-border` | `#d1d5db` | Bordes de controles |
| `--color-border-subtle` | `#e5e7eb` | Separadores y bordes de tarjeta |
| `--color-primary` | `#1d4ed8` | Acción principal y selección |
| `--color-danger` | `#b91c1c` | Acciones destructivas |
| `--color-focus` | `#1d4ed8` | Anillo de foco |
| `--color-header-bg` | `#1f2937` | Barra superior |

Los badges tienen su propio par de tokens fondo/texto por prioridad
(`--color-priority-*`) y por estado (`--color-status-*`).

### Espaciado

Escala de múltiplos de 4px. **No** se usan valores intermedios.

| Token | `--space-1` | `--space-2` | `--space-3` | `--space-4` | `--space-5` | `--space-6` |
|---|---|---|---|---|---|---|
| Valor | 0.25rem | 0.5rem | 0.75rem | 1rem | 1.5rem | 2rem |

### Tipografía

`--font-family-base` (fuentes del sistema), y tamaños
`--font-size-xs` (0.75rem) · `--font-size-sm` (0.85rem) ·
`--font-size-base` (1rem) · `--font-size-lg` (1.25rem).
Interlineado base `--line-height-base: 1.5`.

### Formas y elevación

`--radius-sm` (0.25rem, controles) · `--radius-md` (0.5rem, tarjetas) ·
`--radius-pill` (999px, badges) · `--shadow-sm` (reposo) ·
`--shadow-md` (hover).

### Layout

`--layout-max-width: 75rem` — ancho máximo del contenido, centrado.
`--card-min-width: 18rem` — ancho mínimo de una tarjeta en la cuadrícula.

## 3. Puntos de corte

Enfoque **mobile-first**: el estilo base es el de móvil y las media queries
solo añaden a partir de cierto ancho.

```scss
@use 'breakpoints' as bp;

.mi-bloque {
  padding: var(--space-4);          // móvil

  @include bp.respond-from(sm) {    // ≥ 40rem (640px)
    padding: var(--space-5);
  }
}
```

| Nombre | Ancho | Cuándo |
|---|---|---|
| `sm` | 40rem (640px) | Teléfono grande / tablet vertical |
| `md` | 60rem (960px) | Tablet horizontal / escritorio |

Los breakpoints son variables **SCSS**, no custom properties, porque
`@media` no puede evaluar `var(--...)`.

## 4. Cuadrícula de tarjetas

Una sola regla resuelve todos los anchos, sin media queries:

```scss
grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--card-min-width)), 1fr));
```

- `auto-fill` → el navegador decide cuántas columnas caben.
- `minmax(..., 1fr)` → las columnas reparten el espacio sobrante por igual.
- `min(100%, 18rem)` → en una pantalla más estrecha que 18rem, el mínimo
  pasa a ser el 100% disponible. **Esto es lo que evita el desplazamiento
  horizontal**; con `minmax(18rem, 1fr)` a secas, la tarjeta desbordaría.

## 5. Botones

Se usa la clase global `.btn` y sus modificadores; no se estilan
`<button>` desde cero en cada componente.

| Clase | Uso |
|---|---|
| `.btn` | Botón por defecto |
| `.btn--primary` | Acción principal |
| `.btn--danger` | Acción destructiva |
| `.btn--icon` | Cuadrado, solo icono — **exige `aria-label`** |

Estados obligatorios en cualquier control:

| Estado | Regla |
|---|---|
| `:hover` | Cambia el fondo, siempre con `:not(:disabled)` |
| `:focus-visible` | Anillo global de 2px — **nunca** se elimina |
| `:disabled` | `cursor: not-allowed`, fondo y texto apagados |

## 6. Nombres de clases (BEM)

`bloque__elemento--modificador`, siempre en minúsculas y con guiones.

```scss
.incident-card { }            // bloque
.incident-card__title { }     // elemento
.incident-card--selected { }  // modificador
```

Con SCSS se escribe anidado con `&`:

```scss
.incident-card {
  &__title { }
  &--selected { }
}
```

No se anidan selectores por estructura HTML (`.a .b .c`): la especificidad
crece y el estilo queda atado al marcado.

## 7. Reglas de accesibilidad

1. Elementos **nativos** para todo lo interactivo: `<button>` y `<a>`, nunca
   un `<div>` con `(click)`.
2. Todo control tiene **nombre accesible**. Si solo muestra un icono, se
   aporta con `aria-label` y el `<svg>` lleva `aria-hidden="true"`.
3. El foco **siempre** se ve. Sobre fondo oscuro se cambia el color del
   anillo, no se elimina.
4. Contraste mínimo **4.5:1** (WCAG AA) para texto.
5. El color nunca es el único indicador: la selección añade un borde
   interior, no solo un tinte.
6. Texto solo para lectores de pantalla con `.visually-hidden` (nunca
   `display: none`, que lo oculta también a la asistencia técnica).

### Contrastes verificados

Medidos sobre los pares reales de la paleta (WCAG 2.1, texto normal):

| Par | Ratio | AA |
|---|---|---|
| Texto principal sobre fondo de página | 16.98:1 | ✅ |
| Texto principal sobre superficie | 17.74:1 | ✅ |
| Texto atenuado sobre superficie | 7.56:1 | ✅ |
| Texto atenuado sobre superficie tenue | 6.90:1 | ✅ |
| Texto deshabilitado sobre superficie tenue | 5.15:1 | ✅ |
| Primario sobre blanco | 6.70:1 | ✅ |
| Blanco sobre primario | 6.70:1 | ✅ |
| Peligro sobre blanco | 6.47:1 | ✅ |
| Texto de la barra superior | 14.68:1 | ✅ |
| Texto atenuado de la barra superior | 9.96:1 | ✅ |
| Badge prioridad baja | 7.15:1 | ✅ |
| Badge prioridad media | 6.37:1 | ✅ |
| Badge prioridad alta | 5.40:1 | ✅ |
| Badge prioridad crítica | 5.74:1 | ✅ |
| Badge estado abierta | 8.06:1 | ✅ |
| Badge estado en progreso | 6.38:1 | ✅ |
| Badge estado resuelta | 6.49:1 | ✅ |
| Badge estado cerrada | 6.10:1 | ✅ |
| Anillo de foco sobre fondo de página | 6.41:1 | ✅ |

**19/19 pares cumplen AA.** El único que fallaba era el texto deshabilitado
(`#6b7280`, 4.41:1); se sustituyó por `#5f6874` (5.15:1).

## 8. Checklist antes de dar un estilo por terminado

- [ ] ¿Usa tokens en vez de valores literales?
- [ ] ¿Sigue BEM y vive en el archivo del alcance correcto?
- [ ] ¿Funciona a 320px de ancho sin desplazamiento horizontal?
- [ ] ¿Tiene `:hover`, `:focus-visible` y `:disabled` si es interactivo?
- [ ] ¿El control es un elemento nativo con nombre accesible?
- [ ] ¿El contraste llega a 4.5:1?
