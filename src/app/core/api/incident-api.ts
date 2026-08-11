import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { Incident } from '../models/incident.model';

/** Ruta base de la API de incidencias. */
const BASE_URL = '/api/incidents';

/**
 * Capa de acceso HTTP.
 *
 * Su única responsabilidad es **hablar con el servidor**: construir la URL,
 * elegir el verbo y tipar la respuesta. No guarda estado, no decide reglas
 * de negocio y no sabe nada de la interfaz.
 *
 * Esa separación es la que permite que `IncidentService` siga siendo el
 * dueño del estado, como desde el Día 9, sin enterarse de que los datos
 * ahora viajan por la red.
 */
@Injectable({
  providedIn: 'root',
})
export class IncidentApi {
  private readonly http = inject(HttpClient);

  /** `GET /api/incidents` */
  getAll(): Observable<Incident[]> {
    return this.http.get<Incident[]>(BASE_URL).pipe(catchError(toReadableError));
  }

  /** `GET /api/incidents/:id` */
  getById(id: string): Observable<Incident> {
    return this.http.get<Incident>(`${BASE_URL}/${id}`).pipe(catchError(toReadableError));
  }

  /** `POST /api/incidents` */
  create(incident: Incident): Observable<Incident> {
    return this.http.post<Incident>(BASE_URL, incident).pipe(catchError(toReadableError));
  }

  /** `PUT /api/incidents/:id` */
  update(incident: Incident): Observable<Incident> {
    return this.http
      .put<Incident>(`${BASE_URL}/${incident.id}`, incident)
      .pipe(catchError(toReadableError));
  }

  /** `DELETE /api/incidents/:id` */
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`).pipe(catchError(toReadableError));
  }
}

/**
 * Traduce el error HTTP a un mensaje que se le puede enseñar a una persona.
 *
 * Se hace aquí, en la frontera, para que ni el servicio ni los componentes
 * tengan que saber qué es un código 404 o un `HttpErrorResponse`.
 */
function toReadableError(error: HttpErrorResponse): Observable<never> {
  if (error.status === 0) {
    return throwError(() => new Error('No hay conexión con el servidor.'));
  }

  const messages: Record<number, string> = {
    404: 'La incidencia solicitada no existe.',
    500: 'El servidor no pudo procesar la solicitud.',
  };

  const message =
    error.error?.message ?? messages[error.status] ?? `Error inesperado (${error.status}).`;

  return throwError(() => new Error(message));
}
