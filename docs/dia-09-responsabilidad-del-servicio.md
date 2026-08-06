# Día 9 — Responsabilidad del servicio

> Entregable del Día 9: documento corto sobre qué le corresponde al
> servicio y qué no.

## En una frase

`IncidentService` es **el único punto del sistema que sabe de dónde salen
las incidencias y cómo se modifican**. Todo lo demás las consume.

## Lo que sí le corresponde

| Responsabilidad | Ejemplo |
|---|---|
| Poseer la colección | `private readonly collection = signal(...)` |
| Decidir el origen de los datos | hoy `MOCK_INCIDENTS`; mañana una API |
| Exponer consultas | `getAll()`, `getById()`, `search()` |
| Aplicar las reglas de escritura | `create()` asigna id, fechas y estado inicial |
| Garantizar la inmutabilidad | siempre arreglos nuevos, nunca `push` ni `splice` |

Esa cuarta fila es la más fácil de pasar por alto. Cuando se registra una
incidencia, quien la crea aporta el título, la descripción, la categoría y
la prioridad — pero **no** el identificador, ni la fecha de creación, ni el
estado inicial:

```ts
create(draft: IncidentDraft): Incident {
  const now = new Date().toISOString();
  return { ...draft, id: this.nextId(), status: draft.status ?? 'OPEN', createdAt: now, updatedAt: now };
}
```

"Una incidencia nueva nace abierta" y "los identificadores son correlativos"
son reglas del dominio. Si las decidiera el formulario, cada formulario
nuevo tendría que volver a acordarse de ellas.

## Lo que no le corresponde

| No es del servicio | De quién es | Por qué |
|---|---|---|
| Qué incidencia está seleccionada | `IncidentList` | es estado de *esa* vista, no del dominio |
| Cómo se ve una prioridad (`'HIGH'` → `'Alta'`) | `IncidentPriorityPipe` | es presentación |
| Cuándo resaltar una tarjeta | `IncidentHighlight` | es comportamiento de UI |
| Maquetación y estilos | componentes y `styles.scss` | no son datos |

El caso de la selección es el que mejor marca la frontera. Es tentador
meterla en el servicio "porque es estado", pero si mañana hubiera dos
listados en pantalla, cada uno con su selección, un `selectedId` compartido
los rompería. La regla práctica: **si dos vistas distintas pueden tener
valores distintos a la vez, no es del servicio.**

## Cómo se protege la colección

Tres capas, de fuera hacia dentro:

1. **`private`** — el campo `collection` no es accesible desde fuera de la
   clase; TypeScript lo impide en tiempo de compilación.
2. **`asReadonly()`** — lo que se expone es una señal sin `set` ni `update`.
   Un componente puede leerla y reaccionar a sus cambios, pero no
   escribirla. Hay una prueba que lo comprueba.
3. **Copias al salir** — `getAll()` devuelve `[...this.collection()]`, un
   arreglo nuevo. Si alguien lo vacía, el servicio no se entera.

```ts
private readonly collection = signal<readonly Incident[]>(MOCK_INCIDENTS);
readonly incidents = this.collection.asReadonly();
```

Un matiz honesto sobre el punto 3: la copia es **superficial**. El arreglo es
nuevo, pero los objetos `Incident` de dentro son los mismos. No es un
descuido, es coherente con cómo trabaja el resto de la aplicación: nunca
mutamos una incidencia, la reemplazamos por otra. Si en el futuro alguien
hiciera `incident.title = '...'`, haría falta una copia profunda o congelar
los objetos con `Object.freeze`.

## Qué se gana

- **Se puede cambiar el origen de los datos sin tocar la UI.** El día que
  `getAll()` haga una llamada HTTP, `IncidentList` no cambia ni una línea.
- **Un solo sitio donde arreglar un fallo.** Antes del refactor, la lógica
  de eliminar vivía en el componente; si mañana hubiera un segundo listado,
  habría que duplicarla — y una de las dos copias acabaría desactualizada.
- **Se puede probar sin navegador.** Las 21 pruebas del servicio no
  renderizan nada: crean el servicio y llaman a sus métodos.
- **El estado sobrevive a la navegación.** Al ser `providedIn: 'root'`, hay
  una única instancia: si se elimina una incidencia, se navega a otra ruta y
  se vuelve, la incidencia sigue eliminada.

## Un servicio por responsabilidad

El mismo criterio obligó a crear un segundo servicio. `app.ts` importaba
`MOCK_USERS` directamente para saber quién había iniciado sesión, así que
seguía siendo un componente con datos simulados dentro. Ahora eso vive en
[`UserService`](../src/app/core/services/user-service.ts), con la misma
estructura: colección privada, señal de solo lectura, copias al salir.

Dos servicios pequeños y separados en vez de uno grande: `IncidentService`
no necesita saber nada de usuarios para hacer su trabajo.
