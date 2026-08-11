import { Routes } from '@angular/router';

/**
 * Rutas raíz de la aplicación.
 *
 * Solo conoce las **secciones**, no las pantallas: todo lo de incidencias
 * se delega con `loadChildren` al archivo de rutas de esa funcionalidad.
 * Añadir una pantalla de incidencias ya no obliga a tocar este archivo.
 */
export const routes: Routes = [
  {
    path: 'dashboard',
    title: 'Panel de control · Gestión de Incidencias',
    loadComponent: () =>
      import('./features/dashboard/pages/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    // `loadChildren` no descarga nada de incidencias hasta que se visita
    // alguna de sus rutas.
    path: 'incidents',
    loadChildren: () => import('./features/incidents/incidents.routes').then((m) => m.INCIDENT_ROUTES),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    // Comodín: cualquier dirección que no encaje arriba.
    path: '**',
    title: 'Página no encontrada · Gestión de Incidencias',
    loadComponent: () => import('./shared/pages/not-found/not-found').then((m) => m.NotFound),
  },
];
