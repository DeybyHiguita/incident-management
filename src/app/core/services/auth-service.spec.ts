import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { AuthService } from './auth-service';
import { AuthResponse } from '../models/auth.model';
import { prepareApi, provideTestApi, TEST_CREDENTIALS } from '../../testing/api-testing';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    prepareApi();
    TestBed.configureTestingModule({ providers: [provideTestApi()] });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('arranca sin sesión', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.token()).toBeNull();
  });

  describe('inicio de sesión', () => {
    it('devuelve token y usuario', fakeAsync(() => {
      let response: AuthResponse | undefined;
      service.login(TEST_CREDENTIALS).subscribe((value) => (response = value));
      tick();

      expect(response!.token).toBeTruthy();
      expect(response!.user.email).toBe(TEST_CREDENTIALS.email);
      expect(response!.expiresAt).toBeGreaterThan(Date.now());
    }));

    it('deja la sesión activa', fakeAsync(() => {
      service.login(TEST_CREDENTIALS).subscribe();
      tick();

      expect(service.isAuthenticated()).toBe(true);
      expect(service.currentUser()?.name).toBe('Ana Torres');
      expect(service.token()).toBeTruthy();
    }));

    it('no distingue mayúsculas en el correo', fakeAsync(() => {
      service.login({ ...TEST_CREDENTIALS, email: 'ANA.TORRES@EXAMPLE.COM' }).subscribe();
      tick();

      expect(service.isAuthenticated()).toBe(true);
    }));

    it('rechaza una contraseña incorrecta sin dejar sesión', fakeAsync(() => {
      let failure: Error | undefined;
      service
        .login({ ...TEST_CREDENTIALS, password: 'incorrecta' })
        .subscribe({ error: (error) => (failure = error) });
      tick();

      expect(failure?.message).toBe('Correo o contraseña incorrectos.');
      expect(service.isAuthenticated()).toBe(false);
    }));

    it('da el mismo mensaje si el correo no existe: no revela quién está registrado', fakeAsync(() => {
      let failure: Error | undefined;
      service
        .login({ email: 'nadie@example.com', password: TEST_CREDENTIALS.password })
        .subscribe({ error: (error) => (failure = error) });
      tick();

      expect(failure?.message).toBe('Correo o contraseña incorrectos.');
    }));
  });

  describe('persistencia', () => {
    it('guarda la sesión para sobrevivir a una recarga', fakeAsync(() => {
      service.login(TEST_CREDENTIALS).subscribe();
      tick();

      // Una instancia nueva simula el arranque tras recargar la página.
      // Se crea dentro del contexto de inyección: el servicio pide HttpClient.
      const restored = freshService();
      expect(restored.isAuthenticated()).toBe(true);
      expect(restored.currentUser()?.name).toBe('Ana Torres');
    }));

    it('descarta una sesión caducada', fakeAsync(() => {
      service.login(TEST_CREDENTIALS).subscribe();
      tick();

      const stored = JSON.parse(sessionStorage.getItem('incident-management.session')!);
      stored.expiresAt = Date.now() - 1000;
      sessionStorage.setItem('incident-management.session', JSON.stringify(stored));

      expect(freshService().isAuthenticated()).toBe(false);
      expect(sessionStorage.getItem('incident-management.session')).toBeNull();
    }));

    it('descarta una sesión corrupta sin romperse', () => {
      sessionStorage.setItem('incident-management.session', 'esto no es JSON');

      expect(() => freshService()).not.toThrow();
      expect(sessionStorage.getItem('incident-management.session')).toBeNull();
    });
  });

  describe('cierre de sesión', () => {
    beforeEach(fakeAsync(() => {
      service.login(TEST_CREDENTIALS).subscribe();
      tick();
    }));

    it('deja la sesión vacía', () => {
      service.logout();

      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
      expect(service.token()).toBeNull();
    });

    it('borra la sesión guardada, para que recargar no la resucite', () => {
      service.logout();

      expect(sessionStorage.getItem('incident-management.session')).toBeNull();
      expect(freshService().isAuthenticated()).toBe(false);
    });
  });

  /** Instancia nueva del servicio, como al recargar la página. */
  function freshService(): AuthService {
    return TestBed.runInInjectionContext(() => new AuthService());
  }
});
