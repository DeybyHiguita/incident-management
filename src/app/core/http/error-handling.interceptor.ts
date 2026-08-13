import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { CORRELATION_ID_HEADER } from './correlation-id.interceptor';

/**
 * Mensajes por código de estado.
 *
 * Están aquí, en un único sitio, para que toda la aplicación diga lo mismo
 * ante el mismo fallo. Antes esta traducción vivía en `IncidentApi`, así que
 * cada capa de acceso nueva habría tenido que repetirla.
 */
const MESSAGES: Readonly<Record<number, string>> = {
  400: 'Los datos enviados no son válidos. Revisa el formulario e inténtalo de nuevo.',
  401: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
  403: 'No tienes permisos para realizar esta acción.',
  404: 'El recurso solicitado no existe.',
  500: 'El servidor no pudo procesar la solicitud. Inténtalo más tarde.',
};

/** Error de la aplicación: ya traducido y con el rastro para soporte. */
export class AppHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly correlationId: string | null,
  ) {
    super(message);
    this.name = 'AppHttpError';
  }
}

/**
 * Traduce cualquier fallo HTTP a un error con mensaje legible.
 *
 * A partir de aquí, ni los servicios ni los componentes vuelven a ver un
 * `HttpErrorResponse` ni un código de estado: reciben algo que se le puede
 * enseñar a una persona.
 */
export const errorHandlingInterceptor: HttpInterceptorFn = (request, next) => {
  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const correlationId = request.headers.get(CORRELATION_ID_HEADER);

      return throwError(
        () => new AppHttpError(toMessage(error), error.status, correlationId),
      ) as Observable<never>;
    }),
  );
};

function toMessage(error: HttpErrorResponse): string {
  // Estado 0: la petición no llegó a salir (sin red, DNS, CORS…).
  if (error.status === 0) {
    return 'No hay conexión con el servidor. Comprueba tu red.';
  }

  // Si el servidor explica el problema, su mensaje gana: sabe más que
  // nosotros sobre lo que ha fallado.
  const fromServer = error.error?.message;
  if (typeof fromServer === 'string' && fromServer.trim() !== '') {
    return fromServer;
  }

  return MESSAGES[error.status] ?? `Error inesperado del servidor (${error.status}).`;
}
