import { TestBed, fakeAsync } from '@angular/core/testing';
import { RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { authGuard } from './auth-guard';
import { roleGuard } from './role-guard';
import { AuthService } from '../services/auth-service';
import { CREDENTIALS_BY_ROLE, prepareApi, provideTestApi } from '../../testing/api-testing';

/**
 * Pruebas unitarias de los guards.
 *
 * El spec de rutas ya los ejercita navegando de verdad; aquí se llaman
 * directamente para cubrir cada rama por separado, que en código de
 * autorización conviene tener explícito: una rama sin probar es un permiso
 * sin comprobar.
 */
describe('guards', () => {
  let authService: AuthService;

  /** Estado de ruta mínimo: al guard solo le interesa la URL. */
  const stateFor = (url: string) => ({ url }) as RouterStateSnapshot;

  beforeEach(() => {
    prepareApi();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideTestApi()],
    });

    authService = TestBed.inject(AuthService);
  });

  /** Ejecuta un guard dentro del contexto de inyección. */
  function run(guard: typeof authGuard, url = '/incidents') {
    return TestBed.runInInjectionContext(() =>
      guard({} as never, stateFor(url)),
    ) as boolean | UrlTree;
  }

  async function signIn(role: keyof typeof CREDENTIALS_BY_ROLE): Promise<void> {
    await firstValueFrom(authService.login(CREDENTIALS_BY_ROLE[role]));
  }

  describe('authGuard', () => {
    it('deja pasar con sesión iniciada', async () => {
      await signIn('REQUESTER');

      expect(run(authGuard)).toBe(true);
    });

    it('sin sesión redirige al inicio de sesión', () => {
      const result = run(authGuard);

      expect(result).toEqual(jasmine.any(UrlTree));
      expect(String(result)).toContain('/login');
    });

    it('conserva el destino en returnUrl', () => {
      const result = run(authGuard, '/incidents/inc-003');

      expect(String(result)).toContain('returnUrl=%2Fincidents%2Finc-003');
    });
  });

  describe('roleGuard', () => {
    it('deja pasar si el rol está entre los permitidos', async () => {
      await signIn('ADMIN');

      expect(run(roleGuard('ADMIN', 'AGENT'))).toBe(true);
    });

    it('deja pasar a cualquiera de los roles de la lista', async () => {
      await signIn('AGENT');

      expect(run(roleGuard('ADMIN', 'AGENT'))).toBe(true);
    });

    it('con sesión pero sin permiso manda a acceso denegado', async () => {
      await signIn('REQUESTER');

      const result = run(roleGuard('ADMIN'));

      expect(String(result)).toContain('/forbidden');
      // No al login: volver a entrar con la misma cuenta no daría acceso.
      expect(String(result)).not.toContain('/login');
    });

    it('sin sesión manda al inicio de sesión, no a acceso denegado', () => {
      const result = run(roleGuard('ADMIN'));

      expect(String(result)).toContain('/login');
      expect(String(result)).not.toContain('/forbidden');
    });

    it('una lista de roles vacía no deja pasar a nadie', async () => {
      await signIn('ADMIN');

      expect(String(run(roleGuard()))).toContain('/forbidden');
    });
  });

  describe('permisos del servicio', () => {
    it('un ADMIN puede administrar y gestionar incidencias', fakeAsync(async () => {
      await signIn('ADMIN');

      expect(authService.canAdminister()).toBe(true);
      expect(authService.canManageIncidents()).toBe(true);
    }));

    it('un AGENT gestiona incidencias pero no administra', async () => {
      await signIn('AGENT');

      expect(authService.canAdminister()).toBe(false);
      expect(authService.canManageIncidents()).toBe(true);
    });

    it('un REQUESTER no puede ni lo uno ni lo otro', async () => {
      await signIn('REQUESTER');

      expect(authService.canAdminister()).toBe(false);
      expect(authService.canManageIncidents()).toBe(false);
    });

    it('sin sesión no hay permiso alguno', () => {
      expect(authService.canAdminister()).toBe(false);
      expect(authService.canManageIncidents()).toBe(false);
      expect(authService.role()).toBeNull();
    });
  });
});
