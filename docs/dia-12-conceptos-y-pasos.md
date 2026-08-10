# Día 12 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20.
> Objetivo del día: **validadores personalizados y formularios dinámicos.**

## 1. Conceptos del día

### Qué es un validador

Una función que recibe un control y devuelve `null` si todo está bien, o un
objeto describiendo el error:

```ts
export function notOnlyWhitespace(control: AbstractControl): ValidationErrors | null {
  return control.value.trim() === '' ? { onlyWhitespace: true } : null;
}
```

La clave del diseño: **el validador no escribe mensajes**. Devuelve un
código de error (`onlyWhitespace`) y datos útiles; traducirlo a texto es
trabajo de la plantilla. Es la misma separación del Día 7 entre el dato
(`'HIGH'`) y su presentación (`'Alta'`).

Son funciones puras, como los pipes: misma entrada, misma salida, sin
estado. Por eso se prueban sin `TestBed` ni navegador, instanciando un
`FormControl` suelto.

### Factorías de validadores

Cuando el validador necesita configuración, se escribe una función que
**devuelve** el validador:

```ts
export function forbiddenWords(words: readonly string[]): ValidatorFn {
  const forbidden = words.map(normalizeText); // se prepara una sola vez
  return (control) => { … };
}
```

Es el patrón del propio Angular: `Validators.minLength(5)` no es un
validador, es una fábrica que produce uno. La ventaja práctica es que el
trabajo de preparación (aquí, normalizar la lista de palabras) se hace una
vez al crear el formulario y no en cada pulsación de tecla.

### Validadores de control vs. de grupo

Un detalle que decide dónde va cada regla:

| Regla | Dónde se aplica | Por qué |
|---|---|---|
| «no puede estar vacía» | a cada etiqueta | el error es de esa etiqueta |
| «máximo 5 etiquetas» | al `FormArray` | el error es del conjunto |
| «sin etiquetas repetidas» | al `FormArray` | ninguna etiqueta es «la culpable» |

No tendría sentido marcar en rojo una etiqueta concreta por estar repetida:
lo están las dos. Por eso `maxItems` y `noDuplicates` se aplican al array
entero y su mensaje aparece bajo el grupo, no bajo un campo.

### Por qué `required` no basta

`Validators.required` da por válido cualquier valor presente, y `'   '` lo
es. Sin `notOnlyWhitespace` se podría registrar una incidencia con el título
invisible.

Esto tapa un hueco real que dejamos el Día 11: entonces se hacía `.trim()`
justo antes de emitir, así que un título de solo espacios pasaba la
validación y se guardaba **vacío**. El `trim()` sigue ahí para limpiar los
espacios de los extremos, pero ahora la regla se comprueba de verdad.

### Comparar texto de forma sensata

Dos decisiones que evitan falsos resultados:

- **Sin acentos ni mayúsculas.** `normalize('NFD')` separa cada letra de su
  tilde y luego se descartan las tildes, así «revisión» y «revision» se
  detectan igual.
- **Por palabra completa, no por subcadena.** Si `test` se buscara como
  subcadena, «con*test*ador» quedaría rechazado. El texto se parte en
  palabras y se compara contra un `Set`.

El mismo criterio se aplica a las etiquetas: «Red», «red » y «RED» son la
misma, así que `normalizeTag` recorta, pasa a minúsculas y colapsa los
espacios internos antes de comparar.

### `FormArray`: colecciones dinámicas

Mientras un `FormGroup` tiene campos fijos y con nombre, un `FormArray`
tiene una cantidad variable de controles accesibles por índice. Es lo que
permite que el usuario añada y quite etiquetas en tiempo de ejecución:

```ts
tags: this.formBuilder.array<FormControl<string>>([], {
  validators: [maxItems(MAX_TAGS), noDuplicates],
}),
```

En la plantilla se enlaza con `formArrayName` y cada control con su índice:

```html
<fieldset formArrayName="tags">
  @for (tag of tags.controls; track tag) {
    <input [formControlName]="$index" />
  }
</fieldset>
```

Dos detalles que costaron una prueba en rojo cada uno:

1. **`track tag`, no `track $index`.** Siguiendo la posición, al quitar una
   etiqueta intermedia Angular reutilizaba las vistas por índice y los
   valores visibles se descolocaban: quitar la segunda de
   `[red, servidor, urgente]` dejaba en pantalla `[red, servidor]`.
   Siguiendo el propio `FormControl` —que es un objeto estable— cada vista
   viaja con su control.

2. **`form.reset()` no vacía un `FormArray`.** Resetea el *valor* de los
   controles existentes, pero no los elimina. Tras registrar una incidencia
   quedaban los inputs de etiqueta vacíos en pantalla. Hay que llamar
   explícitamente a `tags.clear()`.

## 2. Paso a paso — cómo lo hicimos

1. **Crear los cuatro validadores** en
   [`shared/validators/incident-validators.ts`](../src/app/shared/validators/incident-validators.ts):
   `notOnlyWhitespace`, `forbiddenWords(words)`, `maxItems(max)` y
   `noDuplicates`.

2. **Aplicarlos al formulario**: `notOnlyWhitespace` en título, descripción
   y categoría; `forbiddenWords` en el título con la lista
   `['test', 'prueba', 'pruebas', 'asdf', 'xxx']`, que delata las
   incidencias de prueba.

3. **Añadir `tags` al modelo** `Incident` como `readonly string[]` opcional,
   y mostrarlas en la tarjeta como una lista semántica.

4. **Construir el `FormArray`** con sus botones de añadir y quitar, el tope
   de 5 etiquetas (el botón se deshabilita al llegar) y los mensajes de
   error del grupo.

5. **Pruebas** (42 nuevas): 26 de los validadores por separado —sin
   `TestBed`, instanciando controles sueltos— y 16 del formulario, que
   cubren añadir, quitar la etiqueta correcta, el tope, los duplicados y el
   vaciado al limpiar.

6. **Verificar**:

   ```bash
   ng build                                          # sin errores
   ng test --watch=false --browsers=ChromeHeadless   # 184 SUCCESS
   ```

7. **Commit** con el mensaje sugerido por el reto:

   ```bash
   git commit -m "feat(forms): add custom validators and dynamic incident tags"
   ```

## 3. Entregable del día

| Entregable | Dónde está |
|---|---|
| Validadores personalizados | `shared/validators/incident-validators.ts` — cuatro, reutilizables y sin dependencias de ningún componente |
| Gestión dinámica de etiquetas | `FormArray` en `IncidentForm`, con alta, baja, tope de 5 y sin duplicados |
| Pruebas unitarias de validación | `incident-validators.spec.ts` (26) más las 16 del formulario |

## 4. Una prueba que se volvió roja por buen motivo

Al añadir `forbiddenWords`, una prueba del Día 11 empezó a fallar: usaba el
título *«Segunda incidencia de prueba»*, y «prueba» pasó a ser palabra
restringida. No era un fallo del código, sino el validador funcionando
sobre un dato que había dejado de ser válido. Se cambió el título de la
prueba y se dejó anotado el motivo.

## 5. Resultado

- Cuatro validadores propios, puros y probados de forma aislada.
- Etiquetas dinámicas con `FormArray`, con validación de conjunto además de
  la de cada campo.
- Cerrado el hueco del Día 11: un título de solo espacios ya no se puede
  registrar.
- 184 pruebas en verde (142 anteriores + 42 nuevas).
