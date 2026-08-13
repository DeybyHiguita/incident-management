import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading-service';

/**
 * Contabiliza las peticiones en vuelo en el `LoadingService`.
 *
 * Un interceptor funcional se ejecuta dentro de un contexto de inyección,
 * así que puede usar `inject()` como cualquier componente.
 *
 * El decremento va en `finalize`, que corre tanto si la petición termina
 * bien como si falla o se **cancela** —y las de la búsqueda del Día 16 se
 * cancelan a menudo con `switchMap`—. Con un `tap` en el `next`, cada
 * búsqueda descartada dejaría el indicador encendido para siempre.
 */
export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  const loadingService = inject(LoadingService);

  loadingService.start();

  return next(request).pipe(finalize(() => loadingService.stop()));
};
