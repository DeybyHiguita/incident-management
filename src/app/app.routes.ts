import { Routes } from '@angular/router';

/**
 * Rutas de la aplicación.
 *
 * Todas usan `loadComponent`, así que cada página viaja en su propio
 * fragmento y solo se descarga cuando se visita.
 *
 * El orden importa: Angular toma la **primera** coincidencia. Por eso
 * `incidents/new` va antes que `incidents/:id` —si no, `:id` capturaría la
 * palabra «new»— y el comodín `**` va el último.
 */
export const routes: Routes = [
  {
    path: 'dashboard',
    title: 'Panel de control · Gestión de Incidencias',
    loadComponent: () =>
      import('./features/dashboard/pages/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'incidents',
    title: 'Incidencias · Gestión de Incidencias',
    loadComponent: () =>
      import('./features/incidents/pages/incident-list/incident-list').then((m) => m.IncidentList),
  },
  {
    // Antes que `incidents/:id`: una ruta concreta gana a una con parámetro.
    path: 'incidents/new',
    title: 'Nueva incidencia · Gestión de Incidencias',
    loadComponent: () =>
      import('./features/incidents/pages/incident-new/incident-new').then((m) => m.IncidentNew),
  },
  {
    path: 'incidents/:id',
    title: 'Detalle de incidencia · Gestión de Incidencias',
    loadComponent: () =>
      import('./features/incidents/pages/incident-detail/incident-detail').then(
        (m) => m.IncidentDetail,
      ),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    // Comodín: cualquier dirección que no encaje arriba.
    path: '**',
    title: 'Página no encontrada · Gestión de Incidencias',
    loadComponent: () => import('./shared/pages/not-found/not-found').then((m) => m.NotFound),
  },
];
