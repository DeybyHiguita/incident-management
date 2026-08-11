import { Routes } from '@angular/router';

/**
 * Rutas de la funcionalidad de incidencias.
 *
 * Viven en su propio archivo, junto al código que enrutan, en vez de en
 * `app.routes.ts`. Dos ventajas: la raíz no necesita conocer la estructura
 * interna de cada funcionalidad, y este archivo entero se puede cargar de
 * forma diferida con `loadChildren`.
 *
 * Todas cuelgan de un layout común, así que comparten marco y quedan
 * agrupadas bajo el prefijo `/incidents`.
 */
export const INCIDENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/incidents-layout/incidents-layout').then((m) => m.IncidentsLayout),
    children: [
      {
        path: '',
        title: 'Incidencias · Gestión de Incidencias',
        loadComponent: () =>
          import('./pages/incident-list/incident-list').then((m) => m.IncidentList),
      },
      {
        // Antes que `:id`, o el parámetro capturaría la palabra «new».
        path: 'new',
        title: 'Nueva incidencia · Gestión de Incidencias',
        loadComponent: () => import('./pages/incident-new/incident-new').then((m) => m.IncidentNew),
      },
      {
        // También antes que `:id`: `:id/edit` es más específica.
        path: ':id/edit',
        title: 'Editar incidencia · Gestión de Incidencias',
        loadComponent: () =>
          import('./pages/incident-edit/incident-edit').then((m) => m.IncidentEdit),
      },
      {
        path: ':id',
        title: 'Detalle de incidencia · Gestión de Incidencias',
        loadComponent: () =>
          import('./pages/incident-detail/incident-detail').then((m) => m.IncidentDetail),
      },
    ],
  },
];
