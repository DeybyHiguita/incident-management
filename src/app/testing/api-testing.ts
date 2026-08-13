import { EnvironmentProviders } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed, tick } from '@angular/core/testing';
import {
  DEMO_PASSWORD,
  fakeBackendInterceptor,
  resetFakeBackend,
  setFakeBackendLatency,
} from '../core/api/fake-backend.interceptor';
import { AuthService } from '../core/services/auth-service';
import { authTokenInterceptor } from '../core/http/auth-token.interceptor';
import { IncidentService } from '../core/services/incident-service';
import { correlationIdInterceptor } from '../core/http/correlation-id.interceptor';
import { errorHandlingInterceptor } from '../core/http/error-handling.interceptor';
import { loadingInterceptor } from '../core/http/loading.interceptor';

/**
 * Utilidades para probar contra la API simulada.
 *
 * Las pruebas usan el mismo interceptor que la aplicación, así que
 * recorren el camino completo (servicio → `HttpClient` → interceptor) en
 * lugar de sustituir la capa HTTP por un doble.
 */

/**
 * Proveedores de HTTP con la **misma cadena de interceptores** que usa la
 * aplicación, para que las pruebas recorran el camino real: correlación,
 * contabilidad de carga y traducción de errores incluidas.
 */
export function provideTestApi(): EnvironmentProviders {
  return provideHttpClient(
    withInterceptors([
      correlationIdInterceptor,
      authTokenInterceptor,
      loadingInterceptor,
      errorHandlingInterceptor,
      fakeBackendInterceptor,
    ]),
  );
}

/** Credenciales válidas del backend simulado. */
export const TEST_CREDENTIALS = {
  email: 'ana.torres@example.com',
  password: DEMO_PASSWORD,
};

/**
 * Inicia sesión y espera a la respuesta.
 * Solo se puede llamar dentro de `fakeAsync`.
 */
export function loginForTest(): void {
  TestBed.inject(AuthService).login(TEST_CREDENTIALS).subscribe();
  tick();
}

/**
 * Deja el backend en su estado inicial y sin latencia.
 * Debe llamarse **antes** de inyectar el servicio, porque este carga los
 * datos en su constructor.
 */
export function prepareApi(): void {
  resetFakeBackend();
  setFakeBackendLatency(0);
  // La sesión persiste en sessionStorage: sin esto, una prueba arrastraría
  // la sesión de la anterior.
  sessionStorage.clear();
}

/**
 * Inyecta el servicio y avanza el tiempo hasta que llega la carga inicial.
 * Solo se puede llamar dentro de `fakeAsync`.
 */
export function loadIncidents(): IncidentService {
  const service = TestBed.inject(IncidentService);
  tick();

  return service;
}
