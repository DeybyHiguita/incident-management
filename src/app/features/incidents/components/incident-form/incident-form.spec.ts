import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentForm, IncidentFormValue } from './incident-form';

const VALID = {
  title: 'Fuga en el aire acondicionado',
  description: 'Gotea sobre los equipos del rack principal.',
  category: 'Infraestructura',
  priority: 'HIGH',
};

describe('IncidentForm', () => {
  let component: IncidentForm;
  let fixture: ComponentFixture<IncidentForm>;
  let emitted: IncidentFormValue[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentForm],
    }).compileComponents();

    fixture = TestBed.createComponent(IncidentForm);
    component = fixture.componentInstance;

    emitted = [];
    component.submitted.subscribe((value) => emitted.push(value));

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('estado inicial', () => {
    it('arranca vacío y con el envío deshabilitado', () => {
      expect(submitButton().disabled).toBe(true);
      expect(field('#incident-title').value).toBe('');
    });

    it('no muestra ningún error antes de interactuar', () => {
      expect(errors().length).toBe(0);
    });
  });

  describe('validación', () => {
    it('muestra el error solo después de que el usuario toque el campo', () => {
      expect(errorFor('incident-title')).toBeNull();

      touch('#incident-title');

      expect(errorFor('incident-title')?.textContent).toContain('obligatorio');
    });

    it('exige una longitud mínima en el título', () => {
      type_('#incident-title', 'abc');
      touch('#incident-title');

      expect(errorFor('incident-title')?.textContent).toContain('al menos 5 caracteres');
    });

    it('exige una longitud mínima en la descripción', () => {
      type_('#incident-description', 'corto');
      touch('#incident-description');

      expect(errorFor('incident-description')?.textContent).toContain('al menos 10 caracteres');
    });

    it('rechaza títulos demasiado largos', () => {
      type_('#incident-title', 'a'.repeat(101));
      touch('#incident-title');

      expect(errorFor('incident-title')?.textContent).toContain('No puede superar los 100');
      expect(submitButton().disabled).toBe(true);
    });

    it('marca el campo inválido con aria-invalid y lo asocia a su mensaje', () => {
      touch('#incident-title');

      const input = field('#incident-title');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe('incident-title-error');
      expect(errorFor('incident-title')?.id).toBe('incident-title-error');
    });

    it('el envío sigue deshabilitado mientras falte cualquier campo', () => {
      fillValidForm();
      expect(submitButton().disabled).toBe(false);

      type_('#incident-category', '');
      expect(submitButton().disabled).toBe(true);
    });
  });

  describe('envío', () => {
    it('no emite nada si el formulario es inválido', () => {
      submit();

      expect(emitted.length).toBe(0);
    });

    it('al intentar enviar vacío, revela los errores de todos los campos', () => {
      submit();

      expect(errors().length).toBe(4);
    });

    it('emite los valores cuando el formulario es válido', () => {
      fillValidForm();

      submit();

      expect(emitted.length).toBe(1);
      expect(emitted[0]).toEqual({
        title: VALID.title,
        description: VALID.description,
        category: VALID.category,
        priority: 'HIGH',
        tags: [],
      });
    });

    it('recorta los espacios sobrantes antes de emitir', () => {
      fillValidForm();
      type_('#incident-title', `   ${VALID.title}   `);

      submit();

      expect(emitted[0].title).toBe(VALID.title);
    });

    it('limpia el formulario tras un registro correcto', () => {
      fillValidForm();

      submit();

      expect(field('#incident-title').value).toBe('');
      expect(field('#incident-description').value).toBe('');
      expect(submitButton().disabled).toBe(true);
    });

    it('no muestra errores en el formulario recién limpiado', () => {
      fillValidForm();

      submit();

      expect(errors().length).toBe(0);
    });

    it('confirma el registro con un mensaje anunciable', () => {
      fillValidForm();

      submit();

      const status: HTMLElement = fixture.nativeElement.querySelector('[role="status"]');
      expect(status.textContent).toContain(VALID.title);
    });

    it('permite registrar dos incidencias seguidas', () => {
      fillValidForm();
      submit();

      fillValidForm();
      // Ojo con el título: «prueba» es una palabra restringida (Día 12).
      type_('#incident-title', 'Segunda incidencia registrada');
      submit();

      expect(emitted.length).toBe(2);
      expect(emitted[1].title).toBe('Segunda incidencia registrada');
    });
  });

  describe('limpiar', () => {
    it('vacía los campos sin emitir nada', () => {
      fillValidForm();

      clickButton('Limpiar');

      expect(field('#incident-title').value).toBe('');
      expect(emitted.length).toBe(0);
    });

    it('al dar de alta la acción se llama Limpiar', () => {
      expect(clickableLabels()).toContain('Limpiar');
      expect(clickableLabels()).not.toContain('Restablecer');
    });
  });

  describe('cancelar', () => {
    it('ofrece un botón de cancelar', () => {
      expect(clickableLabels()).toContain('Cancelar');
    });

    it('emite el evento sin enviar el formulario', () => {
      let cancelledTimes = 0;
      component.cancelled.subscribe(() => cancelledTimes++);
      fillValidForm();

      clickButton('Cancelar');

      expect(cancelledTimes).toBe(1);
      expect(emitted.length).toBe(0);
    });

    it('cancela también con el formulario inválido o a medias', () => {
      let cancelledTimes = 0;
      component.cancelled.subscribe(() => cancelledTimes++);
      type_('#incident-title', 'abc');

      clickButton('Cancelar');

      expect(cancelledTimes).toBe(1);
    });

    it('no es de tipo submit: no dispara el envío', () => {
      const cancel = Array.from<HTMLButtonElement>(
        fixture.nativeElement.querySelectorAll('button'),
      ).find((b) => b.textContent?.trim() === 'Cancelar')!;

      expect(cancel.type).toBe('button');
    });
  });

  function clickableLabels(): string[] {
    return Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).map(
      (button) => button.textContent?.trim() ?? '',
    );
  }

  // --- Día 12: validadores personalizados y etiquetas dinámicas ------------

  describe('validadores personalizados', () => {
    it('rechaza un título formado solo por espacios', () => {
      fillValidForm();
      type_('#incident-title', '          ');
      touch('#incident-title');

      expect(errorFor('incident-title')?.textContent).toContain('solo espacios');
      expect(submitButton().disabled).toBe(true);
    });

    it('rechaza un título con palabras restringidas', () => {
      fillValidForm();
      type_('#incident-title', 'Incidencia de prueba del sistema');
      touch('#incident-title');

      expect(errorFor('incident-title')?.textContent).toContain('No se permiten estas palabras');
      expect(errorFor('incident-title')?.textContent).toContain('prueba');
      expect(submitButton().disabled).toBe(true);
    });

    it('acepta un título que solo contiene la palabra restringida como subcadena', () => {
      fillValidForm();
      type_('#incident-title', 'Fallo en el contestador automático');

      expect(errorFor('incident-title')).toBeNull();
      expect(submitButton().disabled).toBe(false);
    });

    it('rechaza una descripción formada solo por espacios', () => {
      fillValidForm();
      type_('#incident-description', '               ');
      touch('#incident-description');

      expect(errorFor('incident-description')?.textContent).toContain('solo espacios');
    });
  });

  describe('etiquetas dinámicas', () => {
    it('empieza sin etiquetas', () => {
      expect(tagInputs().length).toBe(0);
      expect(fixture.nativeElement.textContent).toContain('Sin etiquetas');
    });

    it('añade y quita etiquetas en tiempo de ejecución', () => {
      clickButton('Añadir etiqueta');
      clickButton('Añadir etiqueta');
      expect(tagInputs().length).toBe(2);

      clickButton('Quitar');

      expect(tagInputs().length).toBe(1);
    });

    it('quita la etiqueta correcta, no siempre la última', () => {
      addTags(['red', 'servidor', 'urgente']);

      // Se elimina la del medio.
      tagRemoveButtons()[1].click();
      fixture.detectChanges();

      expect(tagValues()).toEqual(['red', 'urgente']);
    });

    it('no deja superar el máximo de etiquetas', () => {
      for (let i = 0; i < 5; i++) {
        clickButton('Añadir etiqueta');
      }

      expect(tagInputs().length).toBe(5);
      expect(addTagButton().disabled).toBe(true);
    });

    it('rechaza etiquetas duplicadas sin distinguir mayúsculas', () => {
      addTags(['Red', ' red ']);

      submit();

      expect(tagsError()?.textContent).toContain('etiquetas repetidas');
      expect(emitted.length).toBe(0);
    });

    it('exige que una etiqueta añadida no quede vacía', () => {
      fillValidForm();
      clickButton('Añadir etiqueta');

      submit();

      expect(emitted.length).toBe(0);
      expect(errorFor('incident-tag-0')?.textContent).toContain('obligatorio');
    });

    it('emite las etiquetas junto al resto del formulario', () => {
      fillValidForm();
      addTags(['red', 'servidor']);

      submit();

      expect(emitted[0].tags).toEqual(['red', 'servidor']);
    });

    it('recorta los espacios de cada etiqueta', () => {
      fillValidForm();
      addTags(['  red  ']);

      submit();

      expect(emitted[0].tags).toEqual(['red']);
    });

    it('emite un arreglo vacío si no se añadió ninguna', () => {
      fillValidForm();

      submit();

      expect(emitted[0].tags).toEqual([]);
    });

    it('vacía las etiquetas al limpiar el formulario', () => {
      fillValidForm();
      addTags(['red', 'servidor']);

      submit();

      // `form.reset()` no vacía un FormArray por sí solo.
      expect(tagInputs().length).toBe(0);
    });
  });

  function tagInputs(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.incident-form-tag input'));
  }

  function tagValues(): string[] {
    return tagInputs().map((input) => input.value);
  }

  function tagRemoveButtons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.incident-form-tag button'));
  }

  function addTagButton(): HTMLButtonElement {
    return Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Añadir etiqueta',
    )!;
  }

  function addTags(values: string[]): void {
    for (const [index, value] of values.entries()) {
      clickButton('Añadir etiqueta');
      const input = tagInputs()[index];
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    }
  }

  function tagsError(): HTMLElement | null {
    return fixture.nativeElement.querySelector('#incident-tags-error');
  }

  // --- utilidades ----------------------------------------------------------

  function field(selector: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(selector);
  }

  function type_(selector: string, value: string): void {
    const input = field(selector);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function choose(selector: string, value: string): void {
    const select: HTMLSelectElement = fixture.nativeElement.querySelector(selector);
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function touch(selector: string): void {
    field(selector).dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  function fillValidForm(): void {
    type_('#incident-title', VALID.title);
    type_('#incident-description', VALID.description);
    type_('#incident-category', VALID.category);
    choose('#incident-priority', VALID.priority);
  }

  function submit(): void {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function submitButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[type="submit"]');
  }

  function clickButton(label: string): void {
    const buttons = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('button'),
    );
    buttons.find((b) => b.textContent?.trim() === label)?.click();
    fixture.detectChanges();
  }

  function errors(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.incident-form-error'));
  }

  function errorFor(fieldId: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`#${fieldId}-error`);
  }
});
