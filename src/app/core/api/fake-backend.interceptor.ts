import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';
import { Incident } from '../models/incident.model';
import { MOCK_INCIDENTS } from '../mocks/incidents.mock';

/**
 * API simulada.
 *
 * Intercepta las peticiones a `/api/incidents` y responde desde memoria,
 * como haría un servidor REST. Permite trabajar contra `HttpClient` de
 * verdad —con sus Observables, sus códigos de estado y su latencia— sin
 * levantar ningún backend.
 *
 * Cuando exista la API real, se quita este interceptor de `app.config.ts` y
 * no cambia nada más: la capa de acceso ya habla HTTP.
 */

/** Latencia simulada, para que el indicador de carga sea observable. */
let latencyMs = 400;

/** Ajusta la latencia. Las pruebas la ponen a cero. */
export function setFakeBackendLatency(ms: number): void {
  latencyMs = ms;
}

/** Base de la API. */
const BASE_URL = '/api/incidents';

/** Estado del servidor simulado. Vive fuera del interceptor: es «la base de datos». */
let database: Incident[] = MOCK_INCIDENTS.map((incident) => ({ ...incident }));

/** Devuelve la base a su contenido inicial (lo usan las pruebas). */
export function resetFakeBackend(): void {
  database = MOCK_INCIDENTS.map((incident) => ({ ...incident }));
}

/** Fuerza que la siguiente petición falle, para poder probar el error. */
let failNextRequest = false;

export function failNextApiRequest(): void {
  failNextRequest = true;
}

export const fakeBackendInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(BASE_URL)) {
    return next(request);
  }

  // Interruptor de fallos para demostraciones: desde la consola del
  // navegador, `sessionStorage.setItem('fake-backend:fail', '1')` hace que
  // la API empiece a fallar, y quitarlo la devuelve a la normalidad.
  const forcedFailure = globalThis.sessionStorage?.getItem('fake-backend:fail') === '1';

  if (failNextRequest || forcedFailure) {
    failNextRequest = false;
    return fail(500, 'El servidor no pudo procesar la solicitud.');
  }

  const id = request.url.slice(BASE_URL.length).replace(/^\//, '');

  switch (request.method) {
    case 'GET':
      return id ? getOne(id) : ok(database.map((incident) => ({ ...incident })));

    case 'POST':
      return create(request.body as Incident);

    case 'PUT':
      return replace(id, request.body as Incident);

    case 'DELETE':
      return remove(id);

    default:
      return fail(405, `Método no permitido: ${request.method}.`);
  }
};

function getOne(id: string): Observable<HttpResponse<Incident>> {
  const found = database.find((incident) => incident.id === id);

  return found ? ok({ ...found }) : fail(404, `No existe la incidencia ${id}.`);
}

function create(incident: Incident): Observable<HttpResponse<Incident>> {
  database = [...database, { ...incident }];

  return ok({ ...incident }, 201);
}

function replace(id: string, incident: Incident): Observable<HttpResponse<Incident>> {
  if (!database.some((current) => current.id === id)) {
    return fail(404, `No existe la incidencia ${id}.`);
  }

  database = database.map((current) => (current.id === id ? { ...incident } : current));

  return ok({ ...incident });
}

function remove(id: string): Observable<HttpResponse<null>> {
  if (!database.some((incident) => incident.id === id)) {
    return fail(404, `No existe la incidencia ${id}.`);
  }

  database = database.filter((incident) => incident.id !== id);

  return ok(null, 204);
}

function ok<T>(body: T, status = 200): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ status, body })).pipe(delay(latencyMs));
}

function fail(status: number, message: string): Observable<never> {
  return throwError(
    () => new HttpErrorResponse({ status, error: { message }, url: BASE_URL }),
  ).pipe(delay(latencyMs));
}
