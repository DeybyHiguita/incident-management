import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';
import { Incident, IncidentChanges, IncidentDraft } from '../models/incident.model';
import { IncidentSearchCriteria } from '../models/incident-search-criteria.model';
import { IncidentApi } from '../api/incident-api';

/**
 * Fuente única de verdad de las incidencias.
 *
 * Desde el Día 15 los datos vienen de la API, pero el reparto de
 * responsabilidades no cambia: `IncidentApi` habla HTTP y este servicio
 * sigue siendo el dueño del estado. Los componentes tampoco se enteran —
 * siguen leyendo la misma señal que el Día 9.
 */
@Injectable({
  providedIn: 'root',
})
export class IncidentService {
  private readonly api = inject(IncidentApi);

  /** Colección interna. Privada y de escritura exclusiva del servicio. */
  private readonly collection = signal<readonly Incident[]>([]);

  /**
   * Peticiones en vuelo. Es un contador y no un booleano para que dos
   * operaciones simultáneas no se pisen: la primera en terminar dejaría el
   * indicador apagado mientras la otra sigue.
   */
  private readonly pendingRequests = signal(0);

  private readonly lastError = signal<string | null>(null);

  /** `true` mientras la colección aún no se ha cargado por primera vez. */
  private readonly initialized = signal(false);

  readonly incidents = this.collection.asReadonly();
  readonly error = this.lastError.asReadonly();
  readonly loading = computed(() => this.pendingRequests() > 0);

  /** Distingue «no hay incidencias» de «todavía no han llegado». */
  readonly loaded = this.initialized.asReadonly();

  // --- Indicadores derivados -----------------------------------------------

  readonly totalCount = computed(() => this.collection().length);

  readonly criticalCount = computed(
    () => this.collection().filter((incident) => incident.priority === 'CRITICAL').length,
  );

  readonly openCount = computed(
    () => this.collection().filter((incident) => incident.status === 'OPEN').length,
  );

  constructor() {
    this.load();
  }

  // --- Consulta ------------------------------------------------------------

  /** Recarga la colección desde el servidor. */
  load(): void {
    this.request(this.api.getAll()).subscribe({
      next: (incidents) => {
        this.collection.set(incidents);
        this.initialized.set(true);
      },
      // El error ya quedó registrado en `lastError`; aquí solo se evita
      // que una petición fallida rompa la suscripción.
      error: () => this.initialized.set(true),
    });
  }

  /** Todas las incidencias ya cargadas, en un arreglo nuevo. */
  getAll(): readonly Incident[] {
    return [...this.collection()];
  }

  /** Busca en la colección ya cargada. `undefined` si no está. */
  getById(id: string): Incident | undefined {
    return this.collection().find((incident) => incident.id === id);
  }

  /** Filtra aplicando los criterios de búsqueda del dominio (Día 2). */
  search(criteria: IncidentSearchCriteria): readonly Incident[] {
    return this.collection().filter((incident) => criteria.matches(incident));
  }

  // --- Escritura -----------------------------------------------------------

  /**
   * Registra una incidencia.
   *
   * El servicio sigue decidiendo lo que no le toca al formulario: el
   * identificador, las marcas de tiempo y el estado inicial.
   */
  create(draft: IncidentDraft): Observable<Incident> {
    const now = new Date().toISOString();
    const incident: Incident = {
      ...draft,
      id: this.nextId(),
      status: draft.status ?? 'OPEN',
      createdAt: now,
      updatedAt: now,
    };

    return this.request(this.api.create(incident)).pipe(
      // La colección se actualiza cuando el servidor confirma, no antes.
      tap((created) => this.collection.update((current) => [...current, created])),
    );
  }

  /** Aplica cambios parciales a una incidencia ya registrada. */
  update(id: string, changes: IncidentChanges): Observable<Incident> {
    const current = this.getById(id);

    if (!current) {
      return this.request(this.api.getById(id)) as Observable<Incident>;
    }

    const updated: Incident = {
      ...current,
      ...changes,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };

    return this.request(this.api.update(updated)).pipe(
      tap((saved) =>
        this.collection.update((incidents) =>
          incidents.map((incident) => (incident.id === id ? saved : incident)),
        ),
      ),
    );
  }

  /** Elimina una incidencia. */
  remove(id: string): Observable<void> {
    return this.request(this.api.remove(id)).pipe(
      tap(() =>
        this.collection.update((current) => current.filter((incident) => incident.id !== id)),
      ),
    );
  }

  /** Descarta el mensaje de error visible. */
  clearError(): void {
    this.lastError.set(null);
  }

  // --- Interno -------------------------------------------------------------

  /**
   * Envuelve una llamada a la API con la contabilidad de carga y errores,
   * para no repetir lo mismo en cada método.
   */
  private request<T>(source: Observable<T>): Observable<T> {
    this.pendingRequests.update((count) => count + 1);
    this.lastError.set(null);

    return source.pipe(
      tap({
        error: (error: Error) => this.lastError.set(error.message),
      }),
      finalize(() => this.pendingRequests.update((count) => count - 1)),
    );
  }

  /** Siguiente identificador correlativo (`inc-006`, `inc-007`, …). */
  private nextId(): string {
    const highest = this.collection().reduce((max, incident) => {
      const value = Number.parseInt(incident.id.replace(/\D/g, ''), 10);
      return Number.isNaN(value) ? max : Math.max(max, value);
    }, 0);

    return `inc-${String(highest + 1).padStart(3, '0')}`;
  }
}
