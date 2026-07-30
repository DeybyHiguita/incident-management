import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'incidents',
    loadComponent: () =>
      import('./features/incidents/pages/incident-list/incident-list').then(
        (m) => m.IncidentList,
      ),
  },
  { path: '', redirectTo: 'incidents', pathMatch: 'full' },
];
