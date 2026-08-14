import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { Header } from './header';
import { AuthService } from '../../core/services/auth-service';
import { loginForTest, prepareApi, provideTestApi } from '../../testing/api-testing';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    prepareApi();
    await TestBed.configureTestingModule({
      imports: [Header],
      // El enlace de navegación usa routerLink y la cabecera lee la sesión.
      providers: [provideRouter([]), provideTestApi()],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('sin sesión iniciada', () => {
    it('no muestra la navegación ni los datos del usuario', () => {
      expect(fixture.nativeElement.querySelector('nav')).toBeNull();
      expect(fixture.nativeElement.querySelector('.app-header-user')).toBeNull();
    });

    it('sigue mostrando el título del sistema', () => {
      fixture.componentRef.setInput('systemTitle', 'Sistema de Gestión de Incidencias');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Sistema');
    });
  });

  describe('con sesión iniciada', () => {
    beforeEach(fakeAsync(() => {
      loginForTest();
      fixture.detectChanges();
    }));

    it('expone la navegación principal con un nombre accesible', () => {
      const nav: HTMLElement = fixture.nativeElement.querySelector('nav');

      expect(nav.getAttribute('aria-label')).toBe('Navegación principal');
      // Cuatro para un ADMIN: panel, incidencias, nueva y administración.
      expect(nav.querySelectorAll('a').length).toBe(4);
    });

    it('muestra el nombre del usuario autenticado', () => {
      expect(fixture.nativeElement.textContent).toContain('Ana Torres');
    });

    it('muestra el correo y el rol en el detalle', () => {
      expect(fixture.nativeElement.querySelector('#user-details').textContent).toContain(
        'ana.torres@example.com',
      );
    });

    it('describe con aria-expanded si el detalle de usuario está visible', () => {
      const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('#user-details-toggle');

      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(toggle.getAttribute('aria-controls')).toBe('user-details');

      toggle.click();
      fixture.detectChanges();

      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(fixture.nativeElement.querySelector('#user-details')).toBeNull();
    });

    it('un ADMIN ve el enlace de administración', () => {
      expect(navLabels()).toContain('Administración');
    });

    it('cierra la sesión y lleva al inicio de sesión', fakeAsync(() => {
      const router = TestBed.inject(Router);
      spyOn(router, 'navigate');

      clickButton('Cerrar sesión');
      tick();

      expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    }));

    it('tras cerrar sesión desaparece la navegación', fakeAsync(() => {
      // Se intercepta la navegación: el router de prueba no tiene rutas.
      spyOn(TestBed.inject(Router), 'navigate');

      clickButton('Cerrar sesión');
      tick();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('nav')).toBeNull();
    }));
  });

  describe('opciones según el rol (Día 20)', () => {
    it('un AGENT no ve el enlace de administración', fakeAsync(() => {
      loginForTest('AGENT');
      fixture.detectChanges();

      expect(navLabels()).toContain('Incidencias');
      expect(navLabels()).not.toContain('Administración');
    }));

    it('un REQUESTER tampoco', fakeAsync(() => {
      loginForTest('REQUESTER');
      fixture.detectChanges();

      expect(navLabels()).not.toContain('Administración');
    }));
  });

  function navLabels(): string[] {
    return Array.from<HTMLAnchorElement>(
      fixture.nativeElement.querySelectorAll('.app-header-nav-link'),
    ).map((link) => link.textContent?.trim() ?? '');
  }

  function clickButton(label: string): void {
    Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === label)!
      .click();
    fixture.detectChanges();
  }
});
