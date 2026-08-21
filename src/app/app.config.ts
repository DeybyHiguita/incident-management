import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import { fakeBackendInterceptor } from './core/api/fake-backend.interceptor';
import { environment } from '../environments/environment';
import { authTokenInterceptor } from './core/http/auth-token.interceptor';
import { correlationIdInterceptor } from './core/http/correlation-id.interceptor';
import { errorHandlingInterceptor } from './core/http/error-handling.interceptor';
import { loadingInterceptor } from './core/http/loading.interceptor';
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
    // El orden importa: la petición atraviesa la lista de arriba abajo y la
    // respuesta vuelve en sentido contrario.
    //
    //   correlationId → loading → errorHandling → fakeBackend
    //
    // - `correlationId` va primero para que la cabecera llegue a todos.
    // - `loading` envuelve al resto, así cuenta también el tiempo de error.
    // - `errorHandling` es el más cercano al backend: recibe el fallo en
    //   crudo y lo traduce antes de que nadie más lo vea.
    // - `fakeBackend` cierra la cadena. El día que exista la API real, se
    //   quita de aquí y no cambia nada más.
    provideHttpClient(
      withInterceptors([
        correlationIdInterceptor,
        authTokenInterceptor,
        loadingInterceptor,
        errorHandlingInterceptor,
        // El backend simulado solo entra si el entorno lo pide: en
        // producción `useFakeBackend` es `false` y la cadena termina en la
        // red de verdad.
        ...(environment.useFakeBackend ? [fakeBackendInterceptor] : []),
      ]),
    ),
    { provide: LOCALE_ID, useValue: 'es' },
  ],
};
