import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth-service';
import { environment } from '../../../environments/environment';

/**
 * Adjunta el token de sesión a las peticiones a la API.
 *
 * Gracias a esto, ni los servicios ni los componentes tienen que acordarse
 * de mandar la credencial: es exactamente el mismo argumento del Día 18 con
 * el identificador de correlación y el contador de carga.
 *
 * El extremo de inicio de sesión se excluye: pedir un token con un token
 * sería absurdo, y es la petición que se hace precisamente cuando no hay.
 */
export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthService).token();

  if (!token || request.url.startsWith(`${environment.apiBaseUrl}/auth/`)) {
    return next(request);
  }

  return next(
    request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
  );
};
