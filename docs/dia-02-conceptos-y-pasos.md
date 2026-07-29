# Día 2 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20. Complementa a
> [`../../PLAN.md`](../../PLAN.md) y a
> [`dia-02-decisiones-tipado.md`](./dia-02-decisiones-tipado.md) (el
> entregable específico de justificación interfaz/type/clase).

## 1. Conceptos del día

### Tipos primitivos

Los tipos básicos de TypeScript/JavaScript: `string`, `number`, `boolean`,
`null`, `undefined`. Son la base sobre la que se construyen estructuras más
complejas. En nuestro modelo aparecen en campos como `Incident.title:
string` o `Incident.createdAt: string`.

### Arreglos

Colecciones tipadas de un mismo tipo, declaradas como `T[]` o `Array<T>`. Los
usamos en los mocks: `MOCK_USERS: readonly User[]` y
`MOCK_INCIDENTS: readonly Incident[]` — el `readonly` además impide que se
reasignen o muten elementos del arreglo por error.

### Objetos

Estructuras con propiedades con nombre. `Incident` y `User` son, en tiempo
de ejecución, simples objetos; lo que TypeScript añade es la **forma**
(shape) que ese objeto debe cumplir, verificada en tiempo de compilación.

### Interfaces

Contrato que describe la forma de un objeto (qué propiedades tiene y de qué
tipo). Usadas en `Incident` y `User` — ver el detalle de la decisión en
[dia-02-decisiones-tipado.md](./dia-02-decisiones-tipado.md).

### Type aliases

Un nombre alternativo para cualquier tipo, incluidas uniones. Usados en
`IncidentStatus` e `IncidentPriority`.

### Union types

Un valor que puede ser uno de varios tipos, unidos con `|`. Por ejemplo
`IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'`: el
compilador solo acepta esos cuatro valores exactos como `status`.

### Propiedades opcionales

Una propiedad marcada con `?` puede omitirse. `Incident.assignedAgentId?:
string` refleja que una incidencia recién creada puede no tener agente
asignado todavía.

### Propiedades `readonly`

Una propiedad que solo puede asignarse al crear el objeto, no después.
`Incident.id: readonly string` evita que el identificador se reasigne por
error en algún punto de la aplicación.

### Enumeraciones y alternativas mediante uniones literales

TypeScript ofrece `enum` como construcción nativa, pero el reto pide preferir
uniones de literales (`type IncidentPriority = 'LOW' | 'MEDIUM' | ...`)
porque no generan código adicional en tiempo de ejecución y son más simples
de serializar/comparar con una API JSON, evitando el problema típico de los
`enum` numéricos de TypeScript.

### Funciones tipadas

Declarar explícitamente el tipo de cada parámetro y el tipo de retorno de una
función o método, en vez de dejar que se infiera como `any`. Ejemplo:
`matches(incident: Incident): boolean` en `IncidentSearchCriteria`.

### Clases y constructores

Una clase agrupa estado y comportamiento. Su constructor puede recibir
parámetros y, en TypeScript, declarar y asignar propiedades en un solo paso
usando modificadores de acceso en la firma del constructor (ver siguiente
punto). `IncidentSearchCriteria` es la clase que creamos este día.

### Modificadores de acceso

`public`, `private`, `protected` (y `readonly` combinado con ellos) controlan
qué puede verse/usarse desde fuera de la clase. En
`IncidentSearchCriteria` usamos `public readonly` en los parámetros del
constructor (expuestos y inmutables) y `private` en los métodos auxiliares
(`matchesSearchTerm`, `matchesStatus`, etc.), que son detalles internos de
implementación que no deben usarse desde fuera de la clase.

## 2. Paso a paso — cómo lo hicimos

1. **Crear los tipos `IncidentStatus` e `IncidentPriority`** en
   `src/app/core/models/incident.model.ts`, como uniones de literales de
   cadena.

2. **Crear la interfaz `Incident`** en el mismo archivo, con `id` como
   `readonly`, `assignedAgentId` como opcional, y el resto de campos
   tipados con `string` o los tipos anteriores.

3. **Crear la interfaz `User`** en `src/app/core/models/user.model.ts`,
   junto con el type `UserRole = 'ADMIN' | 'AGENT' | 'REQUESTER'` para
   reflejar los tres roles funcionales del reto (Administrador, Agente de
   soporte, Usuario solicitante).

4. **Crear la clase `IncidentSearchCriteria`** en
   `src/app/core/models/incident-search-criteria.model.ts`, con constructor
   de parámetros opcionales (`searchTerm`, `status`, `priority`,
   `category`) y un método público `matches(incident: Incident): boolean`
   que delega en métodos privados por cada criterio.

5. **Definir tipos de parámetros y retornos** en todos los métodos nuevos
   (ninguna función quedó sin tipo de retorno explícito).

6. **Crear datos simulados tipados**: `src/app/core/mocks/users.mock.ts`
   (5 usuarios, cubriendo los 3 roles) y
   `src/app/core/mocks/incidents.mock.ts` (5 incidencias con distintos
   estados y prioridades), ambos tipados como `readonly T[]`.

7. **Eliminar cualquier uso de `any`**: se verificó con

   ```bash
   grep -rn "\bany\b" src/
   ```

   sin resultados.

8. **Verificar que compila sin errores**:

   ```bash
   npx tsc --noEmit -p tsconfig.app.json
   npx ng build
   ```

   Ambos comandos terminaron sin errores.

9. **Escribir el documento de decisiones de tipado**
   ([dia-02-decisiones-tipado.md](./dia-02-decisiones-tipado.md)),
   justificando por qué cada estructura es `type`, `interface` o `class`.

10. **Commit**:

    ```bash
    git add -A
    git commit -m "Day 2: add typed domain models, search criteria class and mock data"
    ```

## 3. Resultado

- Modelos de dominio (`Incident`, `User`) e infraestructura de búsqueda
  (`IncidentSearchCriteria`) completamente tipados, sin `any`.
- Datos simulados listos para usarse en los servicios que se construirán en
  días posteriores.
- Documentación de las decisiones de diseño de tipos.
