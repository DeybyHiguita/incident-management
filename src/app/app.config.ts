import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import { fakeBackendInterceptor } from './core/api/fake-backend.interceptor';
import localeEs from '@angular/common/locales/es';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';

// Los pipes de formato (`date`, `number`, `currency`) usan el locale activo.
// Sin registrarlo, Angular solo conoce `en-US` y las fechas saldrían en inglés.
registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // `withComponentInputBinding` entrega los parámetros de ruta (`:id`)
    // directamente como inputs del componente, sin inyectar ActivatedRoute.
    provideRouter(routes, withComponentInputBinding()),
    // El interceptor simula la API. El día que exista la real, se quita
    // esta línea y no cambia nada más: la capa de acceso ya habla HTTP.
    provideHttpClient(withInterceptors([fakeBackendInterceptor])),
    { provide: LOCALE_ID, useValue: 'es' },
  ],
};
