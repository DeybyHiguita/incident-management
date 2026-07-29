# Día 2 — Decisiones de tipado: interfaz, type o clase

Entregable del Día 2: justificación breve de por qué cada estructura del
dominio se modeló como interfaz, type alias o clase.

## `IncidentStatus` / `IncidentPriority` → **type (unión literal)**

```ts
export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type IncidentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
```

No representan un objeto con forma propia, sino un conjunto cerrado y finito
de valores válidos. Un `type` con unión de literales es la forma idiomática
en TypeScript de simular un "enum" de cadenas: el compilador rechaza
cualquier valor fuera de esa lista, cumpliendo el criterio de aceptación
"los estados y prioridades están restringidos a valores válidos" sin pagar
el costo en runtime de un `enum` real de TypeScript.

## `Incident` y `User` → **interface**

```ts
export interface Incident { id: string; title: string; /* ... */ }
export interface User { id: string; name: string; /* ... */ }
```

Ambos describen la **forma de un objeto de datos** (un DTO/modelo de
dominio), sin comportamiento asociado. Se eligió `interface` en vez de
`type` porque:

- Es la convención más extendida en Angular para modelos de datos.
- Es abierta a extensión (`extends`) si en días posteriores necesitamos
  variantes (por ejemplo, un `IncidentDetail` que añada comentarios).
- Comunica mejor la intención "esto es un contrato de forma de objeto" que
  un alias de tipo.

`Incident.id` es `readonly` porque el identificador no debe cambiar una vez
creado el registro; `assignedAgentId` es opcional (`?`) porque una incidencia
puede no tener agente asignado todavía (coincide con el rol "Usuario
solicitante", que registra incidencias sin asignar).

## `IncidentSearchCriteria` → **class**

```ts
export class IncidentSearchCriteria {
  constructor(
    public readonly searchTerm: string = '',
    public readonly status?: IncidentStatus,
    public readonly priority?: IncidentPriority,
    public readonly category?: string,
  ) {}

  matches(incident: Incident): boolean { /* ... */ }
}
```

A diferencia de `Incident` y `User`, un criterio de búsqueda no es solo
datos: **tiene comportamiento** (decidir si una incidencia cumple el
criterio). Eso es exactamente lo que una interfaz no puede expresar y una
clase sí. Se usó:

- Un **constructor con modificadores de acceso** (`public readonly`) para
  declarar e inicializar las propiedades en un solo paso, todas inmutables
  una vez creado el criterio (un objeto de búsqueda no debería mutar a
  mitad de una consulta).
- Parámetros opcionales (`status`, `priority`, `category`) porque un
  criterio de búsqueda puede filtrar por cualquier combinación de campos, o
  ninguno.
- Un método público `matches(incident: Incident): boolean` con tipos de
  parámetro y retorno explícitos, y métodos privados auxiliares
  (`matchesSearchTerm`, `matchesStatus`, etc.) para mantener cada
  responsabilidad separada, en línea con la regla de calidad "las funciones
  y clases deberán tener responsabilidades claramente delimitadas".

## Resumen

| Estructura | Elegido | Motivo principal |
|---|---|---|
| `IncidentStatus`, `IncidentPriority` | `type` (unión literal) | Conjunto cerrado de valores, no forma de objeto |
| `Incident`, `User` | `interface` | Forma de datos sin comportamiento; convención de modelos en Angular |
| `IncidentSearchCriteria` | `class` | Tiene estado inmutable **y** comportamiento (`matches`) |
