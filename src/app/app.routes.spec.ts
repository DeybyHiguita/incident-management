import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { INCIDENT_ROUTES } from './features/incidents/incidents.routes';
import { AuthService } from './core/services/auth-service';
import { CREDENTIALS_BY_ROLE, prepareApi, provideTestApi } from './testing/api-testing';
import { IncidentNew } from './features/incidents/pages/incident-new/incident-new';
import { IncidentEdit } from './features/incidents/pages/incident-edit/incident-edit';
import { IncidentDetail } from './features/incidents/pages/incident-detail/incident-detail';
import { NotFound } from './shared/pages/not-found/not-found';

/**
 * Navegación real: se resuelven las rutas de verdad, incluidos los
 * `loadChildren` y `loadComponent` diferidos.
 *
 * Todo el spec es `async` y no `fakeAsync`: los `import()` de la carga
 * diferida son promesas reales que `tick()` no puede adelantar. Con
 * `fakeAsync`, estos tests pasaban o fallaban según el orden en que Karma
 * los ejecutara, porque el resultado dependía de si otro test ya había
 * cargado ese fragmento.
 */
describe('rutas de la aplicación', () => {
  let router: Router;
  let location: Location;

  beforeEach(() => {
    prepareApi();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding()), provideTestApi()],
    });

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  /** Inicia sesión y navega, que es lo que hace un usuario real. */
  async function goTo(
    commands: unknown[],
    role: keyof typeof CREDENTIALS_BY_ROLE = 'ADMIN',
  ): Promise<void> {
    await firstValueFrom(TestBed.inject(AuthService).login(CREDENTIALS_BY_ROLE[role]));
    await router.navigate(commands as string[]);
  }

  it('la raíz redirige al panel', async () => {
    await goTo(['/']);

    expect(location.path()).toBe('/dashboard');
  });

  it('resuelve el listado de incidencias', async () => {
    await goTo(['/incidents']);

    expect(location.path()).toBe('/incidents');
  });

  it('resuelve el formulario de alta', async () => {
    await goTo(['/incidents/new']);

    expect(location.path()).toBe('/incidents/new');
    expect(deepestComponent()).toBe(IncidentNew);
  });

  it('«new» no lo captura la ruta con parámetro', async () => {
    // El orden dentro de INCIDENT_ROUTES importa: si `:id` fuera primero,
    // /incidents/new abriría el detalle de una incidencia llamada «new».
    await goTo(['/incidents/new']);

    expect(deepestComponent()).not.toBe(IncidentDetail);
  });

  it('resuelve el detalle con su parámetro', async () => {
    await goTo(['/incidents', 'inc-003']);

    expect(location.path()).toBe('/incidents/inc-003');
    expect(deepestComponent()).toBe(IncidentDetail);
  });

  it('resuelve la edición, que es más específica que el detalle', async () => {
    await goTo(['/incidents', 'inc-003', 'edit']);

    expect(location.path()).toBe('/incidents/inc-003/edit');
    expect(deepestComponent()).toBe(IncidentEdit);
  });

  it('una dirección desconocida cae en la página 404', async () => {
    await goTo(['/esto-no-existe']);

    expect(deepestComponent()).toBe(NotFound);
  });

  it('la 404 conserva la dirección escrita, sin redirigir', async () => {
    await goTo(['/ruta/inventada']);

    expect(location.path()).toBe('/ruta/inventada');
  });

  describe('protección de rutas (Día 19)', () => {
    it('sin sesión, cualquier ruta privada lleva al inicio de sesión', async () => {
      await router.navigate(['/incidents']);

      expect(location.path()).toContain('/login');
    });

    it('el panel también está protegido', async () => {
      await router.navigate(['/dashboard']);

      expect(location.path()).toContain('/login');
    });

    it('conserva a dónde iba el usuario en returnUrl', async () => {
      await router.navigate(['/incidents/inc-003']);

      expect(location.path()).toContain('returnUrl=%2Fincidents%2Finc-003');
    });

    it('el inicio de sesión es accesible sin estar autenticado', async () => {
      await router.navigate(['/login']);

      expect(location.path()).toBe('/login');
    });

    it('tras cerrar sesión, ir a otra ruta privada exige entrar de nuevo', async () => {
      await goTo(['/incidents']);
      expect(location.path()).toBe('/incidents');

      TestBed.inject(AuthService).logout();
      // Se navega a una ruta **distinta**: repetir la actual no dispara una
      // navegación nueva, así que el guard no llegaría a ejecutarse.
      await router.navigate(['/dashboard']);

      expect(location.path()).toContain('/login');
    });
  });

  describe('autorización por roles (Día 20)', () => {
    it('un ADMIN entra en la administración', async () => {
      await goTo(['/admin'], 'ADMIN');

      expect(location.path()).toBe('/admin');
    });

    it('un AGENT no entra en la administración', async () => {
      await goTo(['/admin'], 'AGENT');

      expect(location.path()).toBe('/forbidden');
    });

    it('un REQUESTER tampoco', async () => {
      await goTo(['/admin'], 'REQUESTER');

      expect(location.path()).toBe('/forbidden');
    });

    it('sin sesión, la ruta administrativa manda al login y no a acceso denegado', async () => {
      // Son negativas distintas: sin sesión sí se puede resolver entrando.
      await router.navigate(['/admin']);

      expect(location.path()).toContain('/login');
      expect(location.path()).not.toContain('/forbidden');
    });

    it('un AGENT sí puede editar incidencias', async () => {
      await goTo(['/incidents', 'inc-003', 'edit'], 'AGENT');

      expect(location.path()).toBe('/incidents/inc-003/edit');
    });

    it('un REQUESTER no puede editar incidencias', async () => {
      await goTo(['/incidents', 'inc-003', 'edit'], 'REQUESTER');

      expect(location.path()).toBe('/forbidden');
    });

    it('un REQUESTER sí puede ver el detalle y registrar incidencias', async () => {
      await goTo(['/incidents', 'inc-003'], 'REQUESTER');
      expect(location.path()).toBe('/incidents/inc-003');

      await router.navigate(['/incidents/new']);
      expect(location.path()).toBe('/incidents/new');
    });

    it('la página de acceso denegado es accesible', async () => {
      await goTo(['/forbidden'], 'REQUESTER');

      expect(location.path()).toBe('/forbidden');
    });
  });

  describe('estructura', () => {
    it('la raíz delega las incidencias con loadChildren', () => {
      const incidents = routes.find((route) => route.path === 'incidents');

      expect(incidents?.loadChildren).toBeDefined();
      // La raíz no debe conocer las pantallas de la funcionalidad.
      expect(incidents?.children).toBeUndefined();
    });

    it('las rutas de incidencias cuelgan de un layout con hijas', () => {
      const [layout] = INCIDENT_ROUTES;

      expect(layout.loadComponent).toBeDefined();
      expect(layout.children?.length).toBe(4);
    });

    it('todas las pantallas se cargan de forma diferida', () => {
      for (const route of screens()) {
        expect(route.loadComponent)
          .withContext(`La ruta "${route.path}" no usa loadComponent`)
          .toBeDefined();
      }
    });

    it('cada pantalla declara su título de página', () => {
      for (const route of screens()) {
        expect(route.title).withContext(`La ruta "${route.path}" no tiene título`).toBeTruthy();
      }
    });

    it('todo lo privado está protegido por el guard', () => {
      // `forbidden` es pública a propósito: es el destino de roleGuard.
      const publicPaths = ['login', 'forbidden', '', '**'];

      for (const route of routes.filter((r) => !publicPaths.includes(r.path ?? ''))) {
        expect(route.canActivate)
          .withContext(`La ruta "${route.path}" no exige sesión`)
          .toBeDefined();
      }
    });

    function screens() {
      return [
        ...routes.filter((route) => route.path !== '' && route.path !== 'incidents'),
        ...(INCIDENT_ROUTES[0].children ?? []),
      ];
    }
  });

  /** Componente de la hoja del árbol de rutas activo. */
  function deepestComponent(): unknown {
    let route = router.routerState.root;

    while (route.firstChild) {
      route = route.firstChild;
    }

    return route.component;
  }
});
