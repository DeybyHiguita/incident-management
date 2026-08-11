import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { INCIDENT_ROUTES } from './features/incidents/incidents.routes';
import { prepareApi, provideTestApi } from './testing/api-testing';
import { IncidentNew } from './features/incidents/pages/incident-new/incident-new';
import { IncidentEdit } from './features/incidents/pages/incident-edit/incident-edit';
import { IncidentDetail } from './features/incidents/pages/incident-detail/incident-detail';
import { NotFound } from './shared/pages/not-found/not-found';

/**
 * Navegación real: se resuelven las rutas de verdad, incluidos los
 * `loadChildren` y `loadComponent` diferidos.
 */
describe('rutas de la aplicación', () => {
  let router: Router;
  let location: Location;

  beforeEach(async () => {
    prepareApi();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding()), provideTestApi()],
    });

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);

    await router.navigate(['/']);
  });

  it('la raíz redirige al panel', () => {
    expect(location.path()).toBe('/dashboard');
  });

  it('resuelve el listado de incidencias', async () => {
    await router.navigate(['/incidents']);

    expect(location.path()).toBe('/incidents');
  });

  it('resuelve el formulario de alta', async () => {
    await router.navigate(['/incidents/new']);

    expect(location.path()).toBe('/incidents/new');
    expect(deepestComponent()).toBe(IncidentNew);
  });

  it('«new» no lo captura la ruta con parámetro', async () => {
    // El orden dentro de INCIDENT_ROUTES importa: si `:id` fuera primero,
    // /incidents/new abriría el detalle de una incidencia llamada «new».
    await router.navigate(['/incidents/new']);

    expect(deepestComponent()).not.toBe(IncidentDetail);
  });

  it('resuelve el detalle con su parámetro', async () => {
    await router.navigate(['/incidents', 'inc-003']);

    expect(location.path()).toBe('/incidents/inc-003');
    expect(deepestComponent()).toBe(IncidentDetail);
  });

  it('resuelve la edición, que es más específica que el detalle', async () => {
    await router.navigate(['/incidents', 'inc-003', 'edit']);

    expect(location.path()).toBe('/incidents/inc-003/edit');
    expect(deepestComponent()).toBe(IncidentEdit);
  });

  it('una dirección desconocida cae en la página 404', async () => {
    await router.navigate(['/esto-no-existe']);

    expect(deepestComponent()).toBe(NotFound);
  });

  it('la 404 conserva la dirección escrita, sin redirigir', async () => {
    await router.navigate(['/ruta/inventada']);

    expect(location.path()).toBe('/ruta/inventada');
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
      const screens = [
        ...routes.filter((route) => route.path !== '' && route.path !== 'incidents'),
        ...(INCIDENT_ROUTES[0].children ?? []),
      ];

      for (const route of screens) {
        expect(route.loadComponent)
          .withContext(`La ruta "${route.path}" no usa loadComponent`)
          .toBeDefined();
      }
    });

    it('cada pantalla declara su título de página', () => {
      const screens = [
        ...routes.filter((route) => route.path !== '' && route.path !== 'incidents'),
        ...(INCIDENT_ROUTES[0].children ?? []),
      ];

      for (const route of screens) {
        expect(route.title).withContext(`La ruta "${route.path}" no tiene título`).toBeTruthy();
      }
    });
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
