# Día 9 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **centralizar el acceso a datos y comprender el sistema
> de inyección de dependencias.**
>
> El entregable específico del día está en
> [`dia-09-responsabilidad-del-servicio.md`](dia-09-responsabilidad-del-servicio.md).

## 1. Conceptos del día

### Servicio

Una clase sin plantilla que agrupa lógica reutilizable y estado que no
pertenece a ninguna vista. Mientras un componente responde a "¿cómo se ve
esto?", un servicio responde a "¿de dónde salen los datos y qué se puede
hacer con ellos?".

Hasta ayer, `IncidentList` importaba `MOCK_INCIDENTS` y gestionaba la
colección él mismo. Eso funcionaba con un solo listado, pero ataba la
pantalla a un origen de datos concreto.

### `@Injectable` y `providedIn: 'root'`

El decorador marca la clase como inyectable, y `providedIn: 'root'` la
registra en el inyector raíz:

```ts
@Injectable({ providedIn: 'root' })
export class IncidentService { … }
```

Dos consecuencias prácticas:

1. **Instancia única (singleton)** para toda la aplicación. Quien lo pida
   recibe el mismo objeto — hay una prueba que lo verifica comparando dos
   inyecciones con `toBe`. Por eso el estado sobrevive al cambiar de ruta.
2. ***Tree-shaking*.** Al declararse desde la propia clase y no en una lista
   de `providers`, si nadie la inyecta, no entra en el bundle.

### Inyección de dependencias

El componente no construye sus dependencias: las pide y Angular se las
entrega. En Angular 20 se hace con la función `inject()`:

```ts
export class IncidentList {
  private readonly incidentService = inject(IncidentService);
}
```

Nunca aparece un `new IncidentService()`. Eso es lo que permite que en una
prueba se pueda sustituir por un doble sin tocar el componente, y lo que
hace que todos compartan la misma instancia.

Es el mismo mecanismo del Día 8, cuando `FocusWithin` pidió un `ElementRef`.
Cambia lo que se pide, no cómo se pide.

### Encapsulación del estado

El criterio del día es que la colección interna no sea pública. Se consigue
combinando dos cosas:

```ts
private readonly collection = signal<readonly Incident[]>(MOCK_INCIDENTS);
readonly incidents = this.collection.asReadonly();
```

- `private` → nadie fuera de la clase ve el campo.
- `asReadonly()` → lo que se expone es una señal **sin `set` ni `update`**.
  Se puede leer y reaccionar a sus cambios, pero para modificarla hay que
  pasar por un método del servicio.

Es exactamente el mismo patrón que ya usamos el Día 8 en `FocusWithin`, y el
mismo espíritu del Día 5: quien posee el dato es quien lo modifica.

### Datos inmutables y copias defensivas

Dos mecanismos distintos que conviene no confundir:

| | Qué hace | Dónde |
|---|---|---|
| Actualización inmutable | crea un arreglo nuevo en vez de mutar el existente | `create()`, `remove()` |
| Copia defensiva | devuelve un arreglo nuevo al llamante | `getAll()`, `search()` |

```ts
// Inmutable: la señal solo notifica si cambia la referencia.
this.collection.update((current) => [...current, incident]);

// Defensiva: si el llamante estropea su copia, el servicio no se entera.
getAll(): readonly Incident[] {
  return [...this.collection()];
}
```

La copia es superficial —el arreglo es nuevo, los objetos de dentro son los
mismos—, lo cual es coherente con que nunca mutamos una incidencia, sino que
la reemplazamos.

### Separación de responsabilidades

El refactor deja una frontera clara: el servicio posee **los datos del
dominio**; el componente posee **el estado de su vista**.

Por eso `selectedId` se quedó en `IncidentList` y no se movió al servicio:
si mañana hubiera dos listados en pantalla, cada uno tendría su propia
selección, pero ambos compartirían las mismas incidencias.

## 2. Paso a paso — cómo lo hicimos

1. **Generar el servicio**:

   ```bash
   ng generate service core/services/incident
   ```

   El CLI generó una clase llamada `Incident`, que **choca con el modelo
   `Incident`** del Día 2. Se renombró la clase a `IncidentService` y los
   archivos a `incident-service.ts` / `incident-service.spec.ts`, siguiendo
   la convención que ya usaban los pipes.

2. **Añadir el tipo `IncidentDraft`** al modelo: una incidencia sin `id`,
   `status`, `createdAt` ni `updatedAt`, porque esos cuatro campos los
   decide el servicio y no quien rellena el formulario.

3. **Implementar la colección privada** con un `signal` y exponerla con
   `asReadonly()`.

4. **Implementar las operaciones**:

   | Operación | Método |
   |---|---|
   | Consulta | `getAll()`, `getById(id)`, `search(criteria)` |
   | Creación | `create(draft)` |
   | Eliminación | `remove(id)` |
   | Utilidad | `reset()`, `isPristine()` |

   `search()` reutiliza la clase `IncidentSearchCriteria` creada el Día 2,
   que hasta hoy no tenía consumidor.

5. **Refactorizar `IncidentList`**: dejó de importar `MOCK_INCIDENTS`, pasó
   a inyectar el servicio y sus métodos se redujeron a delegar:

   ```ts
   protected onDeleteRequested(incident: Incident): void {
     this.incidentService.remove(incident.id);
   }
   ```

6. **Crear también `UserService`**: al comprobar el criterio "los
   componentes no contienen datos simulados" apareció que `app.ts` seguía
   importando `MOCK_USERS` para el usuario de la sesión. Se centralizó con
   la misma estructura, y `currentUser` pasó a ser una señal (de ahí el
   cambio a `currentUser().name` en la plantilla).

7. **Escribir las pruebas** (28 nuevas): las de los servicios no renderizan
   nada, solo `TestBed.inject` y llamadas a métodos. Cubren los cuatro
   criterios del día, incluido que la señal expuesta no tiene `set` ni
   `update` y que modificar lo devuelto por `getAll()` no afecta al estado
   interno.

   En `incident-list.spec.ts` se añadieron dos pruebas de integración: una
   que verifica con un espía que el componente **delega** en el servicio, y
   otra que cambia el estado desde el servicio y comprueba que la vista se
   actualiza sola.

8. **Verificar**:

   ```bash
   ng build                                          # sin errores
   ng test --watch=false --browsers=ChromeHeadless   # 100 SUCCESS
   ```

   Además, una búsqueda en el código confirma que ya **ningún** componente
   importa datos simulados ni accede a la colección interna, y el DOM
   servido sigue mostrando las 5 incidencias y el usuario de sesión.

9. **Commit** con el mensaje sugerido por el reto:

   ```bash
   git commit -m "refactor(incidents): move data management into injectable service"
   ```

## 3. Criterios de aceptación del día

| Criterio | Cómo se cumple |
|---|---|
| La colección interna no es pública | `private readonly collection` + `asReadonly()` + copias en `getAll()`. Prueba explícita de que la señal expuesta no tiene `set` ni `update`. |
| Los componentes no contienen datos simulados | Ningún componente importa `MOCK_*`; solo lo hacen los dos servicios. Verificado con una búsqueda en todo `src/app`. |
| El servicio tiene métodos claramente definidos | Consulta (`getAll`, `getById`, `search`), escritura (`create`, `remove`) y utilidad (`reset`, `isPristine`), cada uno documentado y con pruebas. |
| No se duplican operaciones de datos | Filtrar, crear y eliminar existen en un solo lugar. `IncidentList` ya no manipula arreglos: llama al servicio. |

## 4. Resultado

- Dos servicios inyectables (`IncidentService`, `UserService`) como única
  fuente de datos de la aplicación.
- Componentes desacoplados del origen de los datos: cambiar los mocks por
  una API no requeriría tocar ninguna plantilla.
- La clase `IncidentSearchCriteria` del Día 2 por fin tiene uso real.
- 100 pruebas en verde (72 anteriores + 28 nuevas).
