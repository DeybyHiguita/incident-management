import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { Login } from './login';
import { AuthService } from '../../../../core/services/auth-service';
import { prepareApi, provideTestApi, TEST_CREDENTIALS } from '../../../../testing/api-testing';

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
