import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { IncidentService } from './core/services/incident-service';
import { IncidentNew } from './features/incidents/pages/incident-new/incident-new';
import { NotFound } from './shared/pages/not-found/not-found';

/**
 * Navegación real: se resuelven las rutas de verdad, incluidos los
 * `loadComponent` diferidos.
 */
describe('rutas de la aplicación', () => {
  let router: Router;
  let location: Location;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding())],
    });

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    TestBed.inject(IncidentService).reset();

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
  });

  it('«new» no lo captura la ruta con parámetro', async () => {
    // El orden de `routes` importa: si `:id` fuera primero, /incidents/new
    // abriría el detalle de una incidencia llamada «new».
    await router.navigate(['/incidents/new']);

    expect(resolvedComponent()).toBe(IncidentNew);
  });

  it('resuelve el detalle con su parámetro', async () => {
    await router.navigate(['/incidents', 'inc-003']);

    expect(location.path()).toBe('/incidents/inc-003');
  });

  it('una dirección desconocida cae en la página 404', async () => {
    await router.navigate(['/esto-no-existe']);

    expect(resolvedComponent()).toBe(NotFound);
  });

  it('la 404 conserva la dirección escrita, sin redirigir', async () => {
    await router.navigate(['/ruta/inventada']);

    expect(location.path()).toBe('/ruta/inventada');
  });

  /** Componente que el enrutador acabó activando para la URL actual. */
  function resolvedComponent(): unknown {
    return router.routerState.root.firstChild?.component;
  }

  it('cada ruta declara su título de página', () => {
    const titled = routes.filter((route) => route.path !== '');

    for (const route of titled) {
      expect(route.title).withContext(`La ruta "${route.path}" no tiene título`).toBeTruthy();
    }
  });

  it('todas las páginas se cargan de forma diferida', () => {
    for (const route of routes.filter((r) => r.path !== '')) {
      expect(route.loadComponent)
        .withContext(`La ruta "${route.path}" no usa loadComponent`)
        .toBeDefined();
    }
  });
});
