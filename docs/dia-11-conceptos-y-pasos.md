# Día 11 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **crear el formulario para registrar una incidencia.**

## 1. Conceptos del día

### Formularios reactivos

En un formulario reactivo el modelo vive en TypeScript y la plantilla se
limita a enlazarse con él. Es lo contrario del enfoque *template-driven*,
donde el formulario se define con directivas en el HTML.

| | Reactivo | Template-driven |
|---|---|---|
| Dónde se define | en la clase | en la plantilla |
| Tipado | sí | no |
| Validación | funciones | atributos |
| Pruebas | sin renderizar | requieren el DOM |

Para este caso el reactivo es claramente mejor: el estado de validez se
puede consultar en cualquier momento (`form.invalid`) y las reglas están
donde se pueden leer todas juntas.

### `FormBuilder`, `FormGroup` y `FormControl`

Un `FormControl` representa un campo; un `FormGroup` agrupa varios.
`FormBuilder` es un servicio que ahorra la parte repetitiva de crearlos:

```ts
private readonly formBuilder = inject(FormBuilder);

protected readonly form = this.formBuilder.group({
  title: this.formBuilder.control('', { … }),
  …
});
```

### Formularios tipados y `nonNullable`

El criterio del día es que el formulario esté tipado. Se declara la forma
del grupo con una interfaz:

```ts
interface IncidentFormControls {
  title: FormControl<string>;
  description: FormControl<string>;
  category: FormControl<string>;
  priority: FormControl<IncidentPriority | ''>;
}
```

Aquí aparece el detalle que más se pasa por alto: **por defecto un control
puede volverse `null`**, porque `reset()` lo deja así. Eso obligaría a tipar
todo como `FormControl<string | null>` y a comprobar nulos por todas partes.
La opción `nonNullable: true` lo evita:

```ts
title: this.formBuilder.control('', { nonNullable: true, validators: […] })
```

Con ella, `reset()` devuelve el control a `''` en vez de a `null`, y
`getRawValue()` entrega un objeto con tipos limpios.

El beneficio es real, no cosmético: si mañana alguien renombra un campo del
modelo, el compilador señala el formulario. Y `priority` está tipado como
`IncidentPriority | ''`, donde `''` representa "aún no ha elegido" — el
propio tipo documenta que esa opción vacía existe.

### Validadores

Funciones que reciben el control y devuelven `null` si todo está bien o un
objeto con el error si no:

```ts
validators: [Validators.required, Validators.minLength(5), Validators.maxLength(100)]
```

Angular trae los habituales. Cuando la regla es propia del dominio hay que
escribirla a mano, que es justo el tema del Día 12.

### Estados del control: `touched`, `dirty`, `pristine`

Cada control lleva la cuenta de cómo ha interactuado el usuario:

| Estado | Significa |
|---|---|
| `touched` | recibió el foco y luego lo perdió |
| `dirty` | su valor cambió |
| `pristine` | sigue como estaba |

Esto es lo que resuelve el criterio *"los errores aparecen después de
interacción o envío"*. Un formulario que grita "campo obligatorio" nada más
abrirse es hostil; la regla que aplicamos es:

```ts
protected showError(field: keyof IncidentFormControls): boolean {
  const control = this.form.controls[field];
  return control.invalid && (control.touched || this.submitAttempted());
}
```

Es decir: el campo está mal **y** el usuario ya pasó por él, o ya intentó
enviar. La segunda condición importa porque, al pulsar "Registrar", hay que
revelar también los errores de los campos que el usuario ni siquiera llegó a
abrir — de ahí el `markAllAsTouched()`.

### Mensajes de validación accesibles

No basta con pintar el borde en rojo: el color no llega a quien usa un
lector de pantalla, y tampoco a quien no distingue el rojo. Cada campo
inválido lleva tres cosas:

```html
[attr.aria-invalid]="showError('title')"
[attr.aria-describedby]="showError('title') ? 'incident-title-error' : null"
```

1. un mensaje de texto explícito,
2. `aria-invalid` para anunciar que el campo está mal,
3. `aria-describedby` apuntando al id del mensaje, para que se lea junto al
   campo.

El `<form>` lleva `novalidate` a propósito: desactiva los mensajes
automáticos del navegador para que los únicos visibles sean los nuestros,
que están en español y son consistentes.

### Responsabilidad del formulario

El criterio *"el componente no contiene reglas de negocio duplicadas"* se
cumple decidiendo qué **no** hace el formulario:

| Dato | Quién lo pone |
|---|---|
| título, descripción, categoría, prioridad | el usuario, en el formulario |
| `reporterId` | el contenedor, desde la sesión |
| `id`, `createdAt`, `updatedAt`, `status` inicial | el servicio |

Por eso el formulario **no** emite un `IncidentDraft`, sino su propio tipo:

```ts
export type IncidentFormValue = Omit<IncidentDraft, 'reporterId' | 'status'>;
```

El formulario no sabe quién ha iniciado sesión ni que una incidencia nueva
nace `OPEN`. Solo emite lo que el usuario escribió, y el contenedor completa
el resto:

```ts
protected onIncidentSubmitted(value: IncidentFormValue): void {
  this.incidentService.create({ ...value, reporterId: this.userService.currentUser().id });
}
```

Es la misma división del Día 5 (presentación arriba, decisiones abajo)
aplicada a un formulario.

## 2. Paso a paso — cómo lo hicimos

1. **Generar el componente**:

   ```bash
   ng generate component features/incidents/components/incident-form
   ```

   Va en `components/` y no en `pages/`, porque es una pieza reutilizable y
   no una ruta.

2. **Declarar el formulario tipado** con `FormBuilder`, la interfaz
   `IncidentFormControls` y `nonNullable: true` en los cuatro controles.

3. **Definir las validaciones**: `required` en los cuatro campos,
   `minLength(5)` y `maxLength(100)` en el título, y `minLength(10)` en la
   descripción.

4. **Construir la plantilla** con `[formGroup]`, `formControlName` y
   `(ngSubmit)`, con cada campo acompañado de su `<label>`, su mensaje de
   error condicional y sus atributos ARIA.

5. **Mostrar los errores en el momento adecuado** con el método
   `showError()` descrito arriba, y traducir el error de Angular a un
   mensaje legible en `errorMessage()`.

6. **Deshabilitar el envío** mientras `form.invalid`, y aun así comprobar la
   validez dentro de `onSubmit()`: el atributo `disabled` es una ayuda
   visual, no una garantía — se puede quitar desde las herramientas del
   navegador.

7. **Limpiar tras el registro correcto**: `form.reset()` (que gracias a
   `nonNullable` deja los campos en `''` y no en `null`) y `submitAttempted`
   a `false`, para que el formulario recién vaciado no aparezca lleno de
   errores. Se muestra además una confirmación en un `role="status"`.

8. **Conectar con el contenedor**: el formulario emite `submitted` y
   `IncidentList` completa el `reporterId` y llama a
   `incidentService.create()`.

9. **Pruebas** (21 nuevas): 18 del formulario aislado —incluido que no
   emite nada si es inválido, que revela los cuatro errores al intentar
   enviar vacío, que recorta espacios y que permite registrar dos
   incidencias seguidas— y 3 de integración en el listado, que comprueban
   que la incidencia llega a la lista, que el `reporterId` es el de la
   sesión y que los indicadores del Día 10 se actualizan.

10. **Evidencia en el navegador real**, automatizando el flujo completo:

    | Paso | Envío | Errores visibles | Tarjetas | Total |
    |---|---|---|---|---|
    | Inicial | deshabilitado | 0 | 5 | 5 |
    | Envío vacío | deshabilitado | **4** | 5 | 5 |
    | Formulario válido | habilitado | 0 | 5 | 5 |
    | Tras registrar | deshabilitado | 0 | **6** | **6** |

    Con el título `abc` el mensaje cambia solo: *"Debe tener al menos 5
    caracteres."* Capturas en
    [`img/dia-11-validaciones.png`](img/dia-11-validaciones.png) y
    [`img/dia-11-registro.png`](img/dia-11-registro.png).

11. **Verificar**:

    ```bash
    ng build                                          # sin errores
    ng test --watch=false --browsers=ChromeHeadless   # 142 SUCCESS
    ```

12. **Commit** con el mensaje sugerido por el reto:

    ```bash
    git commit -m "feat(incidents): implement typed reactive incident form"
    ```

## 3. Criterios de aceptación del día

| Criterio | Cómo se cumple |
|---|---|
| El formulario está tipado | `FormGroup<IncidentFormControls>` con `FormControl<string>` y `FormControl<IncidentPriority \| ''>`, todos `nonNullable`. `getRawValue()` devuelve tipos sin `null`. |
| Los errores aparecen después de interacción o envío | `showError()` exige `invalid && (touched || submitAttempted)`. Con el formulario recién abierto hay 0 errores visibles; tras intentar enviar vacío, 4. |
| El formulario no permite guardar información inválida | Doble barrera: el botón se deshabilita con `form.invalid` y `onSubmit()` vuelve a comprobarlo y sale sin emitir. Prueba explícita de que no se emite nada. |
| El componente no contiene reglas de negocio duplicadas | El formulario emite `IncidentFormValue`, sin `reporterId` ni `status`. El `id`, las fechas y el estado inicial siguen siendo del servicio (Día 9); la sesión, del contenedor. |

## 4. Resultado

- Formulario reactivo tipado con cuatro campos, validaciones visibles y
  accesibles, y limpieza automática tras el registro.
- Registro real en memoria: la incidencia aparece en el listado y actualiza
  los indicadores del Día 10 sin ninguna línea de sincronización.
- Ninguna regla de negocio duplicada: el formulario solo sabe de campos.
- 142 pruebas en verde (121 anteriores + 21 nuevas).
