import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';

/**
 * Rutas raíz de la aplicación.
 *
 * Solo conoce las **secciones**, no las pantallas: todo lo de incidencias
 * se delega con `loadChildren` al archivo de rutas de esa funcionalidad.
 *
 * Desde el Día 19, todo salvo el inicio de sesión exige sesión iniciada.
 */
export const routes: Routes = [
  {
    // Única ruta pública: es a donde manda el guard cuando no hay sesión.
    path: 'login',
    title: 'Iniciar sesión · Gestión de Incidencias',
    loadComponent: () => import('./features/auth/pages/login/login').then((m) => m.Login),
  },
  {
    path: 'dashboard',
    title: 'Panel de control · Gestión de Incidencias',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/pages/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    // `loadChildren` no descarga nada de incidencias hasta que se visita
    // alguna de sus rutas. El guard se comprueba antes de descargar: sin
    // sesión, ni siquiera se pide el fragmento.
    path: 'incidents',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/incidents/incidents.routes').then((m) => m.INCIDENT_ROUTES),
  },
  {
    // Ruta administrativa: además de sesión, exige el rol ADMIN.
    // Los dos guards se ejecutan en orden y ambos deben dejar pasar.
    path: 'admin',
    title: 'Administración · Gestión de Incidencias',
    canActivate: [authGuard, roleGuard('ADMIN')],
    loadComponent: () =>
      import('./features/admin/pages/admin-users/admin-users').then((m) => m.AdminUsers),
  },
  {
    // Pública a propósito: es a donde manda `roleGuard` a quien sí ha
    // entrado pero no tiene permiso.
    path: 'forbidden',
    title: 'Acceso denegado · Gestión de Incidencias',
    loadComponent: () => import('./shared/pages/forbidden/forbidden').then((m) => m.Forbidden),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    // Comodín: cualquier dirección que no encaje arriba.
    path: '**',
    title: 'Página no encontrada · Gestión de Incidencias',
    loadComponent: () => import('./shared/pages/not-found/not-found').then((m) => m.NotFound),
  },
];
