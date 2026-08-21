import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { Login } from './login';
import { AuthService } from '../../../../core/services/auth-service';
import { prepareApi, provideTestApi, TEST_CREDENTIALS } from '../../../../testing/api-testing';
import { measureChangeDetection } from '../../../../testing/perf-testing';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let router: Router;

  beforeEach(async () => {
    prepareApi();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), provideTestApi()],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('validación', () => {
    it('no muestra errores antes de interactuar', () => {
      expect(fixture.nativeElement.querySelectorAll('.login-error').length).toBe(0);
    });

    it('al enviar vacío revela los dos errores', fakeAsync(() => {
      submit();

      expect(fixture.nativeElement.querySelectorAll('.login-error').length).toBe(2);
    }));

    it('exige un correo con formato válido', fakeAsync(() => {
      type_('#email', 'no-es-un-correo');
      submit();

      expect(errorFor('email')?.textContent).toContain('correo válido');
    }));

    it('exige una longitud mínima de contraseña', fakeAsync(() => {
      type_('#password', '123');
      submit();

      expect(errorFor('password')?.textContent).toContain('al menos 6 caracteres');
    }));

    it('no llama al servidor si el formulario es inválido', fakeAsync(() => {
      const spy = spyOn(TestBed.inject(AuthService), 'login').and.callThrough();

      submit();

      expect(spy).not.toHaveBeenCalled();
    }));
  });

  describe('inicio de sesión', () => {
    it('autentica y navega con credenciales correctas', fakeAsync(() => {
      fillValid();
      submit();

      expect(TestBed.inject(AuthService).isAuthenticated()).toBe(true);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    }));

    it('muestra el mensaje del servidor si las credenciales fallan', fakeAsync(() => {
      type_('#email', TEST_CREDENTIALS.email);
      type_('#password', 'incorrecta');

      submit();

      expect(fixture.nativeElement.querySelector('.error-banner').textContent).toContain(
        'Correo o contraseña incorrectos.',
      );
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    }));

    it('se puede reintentar tras un fallo', fakeAsync(() => {
      type_('#email', TEST_CREDENTIALS.email);
      type_('#password', 'incorrecta');
      submit();
      expect(fixture.nativeElement.querySelector('.error-banner')).toBeTruthy();

      type_('#password', TEST_CREDENTIALS.password);
      submit();

      expect(TestBed.inject(AuthService).isAuthenticated()).toBe(true);
      expect(fixture.nativeElement.querySelector('.error-banner')).toBeNull();
    }));
  });

  describe('rendimiento (Día 26)', () => {
    it('los errores son un valor derivado, no se recalculan sin cambios', () => {
      const errors = component['visibleErrors'];

      // Un `computed` devuelve la **misma referencia** mientras nada de lo
      // que depende haya cambiado. Con los métodos anteriores, cada ciclo
      // producía un objeto nuevo y volvía a evaluar el formulario.
      const first = errors();
      fixture.detectChanges();
      fixture.detectChanges();

      expect(errors()).toBe(first);
    });

    it('pero sí se recalculan cuando el formulario cambia', () => {
      const errors = component['visibleErrors'];
      const before = errors();

      type_('#email', 'no-es-un-correo');
      component['form'].controls.email.markAsTouched();

      expect(errors()).not.toBe(before);
      expect(errors().email).toContain('correo válido');
    });

    it('usa OnPush', () => {
      // Si alguien lo quitara, la plantilla volvería a evaluarse en cada
      // ciclo de toda la aplicación.
      const definition = (Login as unknown as { ɵcmp: { onPush: boolean } }).ɵcmp;

      expect(definition.onPush).toBe(true);
    });

    it('no reevalúa la plantilla en 10 ciclos sin cambios', () => {
      // La medición del Día 26, convertida en prueba: ya no depende de que
      // alguien se acuerde de repetirla a mano. La cifra la da el propio
      // profiler de Angular, no una aproximación nuestra.
      //
      // Cómo interpretarla, en docs/medir-rendimiento.md.
      const conteo = measureChangeDetection(() => {
        for (let i = 0; i < 10; i++) fixture.detectChanges();
      });

      // Los ciclos se ejecutaron de verdad: sin esto, un 0 en la línea
      // siguiente podría significar simplemente que no se midió nada.
      expect(conteo.changeDetections).toBe(10);
      expect(conteo.templateUpdates).toBe(0);
    });
  });

  function fillValid(): void {
    type_('#email', TEST_CREDENTIALS.email);
    type_('#password', TEST_CREDENTIALS.password);
  }

  function type_(selector: string, value: string): void {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(selector);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    tick();
    fixture.detectChanges();
  }

  function errorFor(field: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`#${field}-error`);
  }
});
