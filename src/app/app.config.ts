import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
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
    { provide: LOCALE_ID, useValue: 'es' },
  ],
};
