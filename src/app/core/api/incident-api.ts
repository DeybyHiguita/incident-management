import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Incident } from '../models/incident.model';
import { environment } from '../../../environments/environment';

/** Ruta base de la API de incidencias, derivada del entorno. */
const BASE_URL = `${environment.apiBaseUrl}/incidents`;

/**
 * Capa de acceso HTTP.
 *
 * Su única responsabilidad es **hablar con el servidor**: construir la URL,
 * elegir el verbo y tipar la respuesta.
 *
 * Desde el Día 18 tampoco traduce los errores: de eso se encarga
 * `errorHandlingInterceptor`, que lo hace para toda la aplicación. Así, una
 * capa de acceso nueva no tiene que acordarse de repetir esa lógica.
 */
@Injectable({
  providedIn: 'root',
})
export class IncidentApi {
  private readonly http = inject(HttpClient);

  /** `GET /api/incidents` */
  getAll(): Observable<Incident[]> {
    return this.http.get<Incident[]>(BASE_URL);
  }

  /**
   * `GET /api/incidents?search=…`
   *
   * El filtrado lo hace el servidor. Con un término vacío devuelve todo, y
   * es el mismo endpoint: no hace falta una ruta aparte.
   */
  search(term: string): Observable<Incident[]> {
    const trimmed = term.trim();
    // Un HttpParams vacío no añade la interrogación a la URL.
    const params = trimmed ? new HttpParams().set('search', trimmed) : new HttpParams();

    return this.http.get<Incident[]>(BASE_URL, { params });
  }

  /** `GET /api/incidents/:id` */
  getById(id: string): Observable<Incident> {
    return this.http.get<Incident>(`${BASE_URL}/${id}`);
  }

  /** `POST /api/incidents` */
  create(incident: Incident): Observable<Incident> {
    return this.http.post<Incident>(BASE_URL, incident);
  }

  /** `PUT /api/incidents/:id` */
  update(incident: Incident): Observable<Incident> {
    return this.http.put<Incident>(`${BASE_URL}/${incident.id}`, incident);
  }

  /** `DELETE /api/incidents/:id` */
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
