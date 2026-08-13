import { HttpInterceptorFn } from '@angular/common/http';

/** Cabecera que transporta el identificador de correlación. */
export const CORRELATION_ID_HEADER = 'X-Correlation-Id';

/**
 * Añade un identificador único a cada petición.
 *
 * Sirve para **correlacionar** lo que pasa en el navegador con lo que
 * registra el servidor: cuando alguien reporta un fallo, ese identificador
 * permite encontrar en los registros del backend exactamente esa petición,
 * en vez de rebuscar por hora aproximada y usuario.
 *
 * Es un interceptor *funcional* (`HttpInterceptorFn`), no una clase: una
 * función que recibe la petición y la pasa al siguiente eslabón de la
 * cadena.
 */
export const correlationIdInterceptor: HttpInterceptorFn = (request, next) => {
  // Las peticiones HTTP son inmutables: no se pueden modificar, se clonan
  // con el cambio aplicado. Igual que la colección del Día 9.
  const withCorrelationId = request.clone({
    setHeaders: { [CORRELATION_ID_HEADER]: newCorrelationId() },
  });

  return next(withCorrelationId);
};

/** Identificador único por petición. */
function newCorrelationId(): string {
  // `randomUUID` solo existe en contextos seguros (HTTPS o localhost); el
  // respaldo evita que la aplicación falle donde no esté disponible.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `cid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
