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
      type_('#incident-title', 'Segunda incidencia de prueba');
      submit();

      expect(emitted.length).toBe(2);
      expect(emitted[1].title).toBe('Segunda incidencia de prueba');
    });
  });

  describe('limpiar', () => {
    it('vacía los campos sin emitir nada', () => {
      fillValidForm();

      clickButton('Limpiar');

      expect(field('#incident-title').value).toBe('');
      expect(emitted.length).toBe(0);
    });
  });

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
    return Array.from(fixture.nativeElement.querySelectorAll('.incident-form__error'));
  }

  function errorFor(fieldId: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`#${fieldId}-error`);
  }
});
