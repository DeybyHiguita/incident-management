import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Incident, IncidentChanges, IncidentDraft } from '../models/incident.model';
import { IncidentPriority, IncidentStatus } from '../models/incident.model';
import { IncidentApi } from '../api/incident-api';
import { LoadingService } from '../services/loading-service';

/** Valor de un filtro cuando no se filtra por ese campo. */
export const ANY = '';

/** Filtros de la vista de incidencias. */
export interface IncidentFilters {
  readonly search: string;
  readonly status: IncidentStatus | typeof ANY;
  readonly priority: IncidentPriority | typeof ANY;
}

const NO_FILTERS: IncidentFilters = { search: ANY, status: ANY, priority: ANY };

/**
 * Almacén de estado de incidencias.
 *
 * Reúne en un solo sitio lo que hasta ahora estaba repartido entre
 * `IncidentService` y los componentes: la colección, la selección, la
 * carga, el error y los filtros.
 *
 * La estructura es siempre la misma, y es lo que conviene retener:
 *
 * ```
 * estado privado (signal)  →  selectores (computed)  →  acciones (métodos)
 *        ↑ nadie de fuera         ↑ solo lectura           ↑ la única vía
 *          lo escribe               para la vista            de escritura
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class IncidentStore {
  private readonly api = inject(IncidentApi);
  private readonly loadingService = inject(LoadingService);

  // --- Estado privado ------------------------------------------------------
  //
  // Todo `private`. Un componente no puede escribir aquí ni por descuido:
  // TypeScript no le deja ver los campos.

  private readonly incidentList = signal<readonly Incident[]>([]);
  private readonly selectedIncidentId = signal<string | null>(null);
  private readonly lastError = signal<string | null>(null);
  private readonly initialized = signal(false);
  private readonly activeFilters = signal<IncidentFilters>(NO_FILTERS);
  /** Resultados que devolvió el servidor para el término de búsqueda. */
  private readonly searchResults = signal<readonly Incident[]>([]);

  // --- Selectores ----------------------------------------------------------
  //
  // Señales de solo lectura y valores derivados. Es todo lo que ve la vista.

  readonly incidents = this.incidentList.asReadonly();
  readonly filters = this.activeFilters.asReadonly();
  readonly error = this.lastError.asReadonly();
  readonly loaded = this.initialized.asReadonly();
  readonly loading = this.loadingService.loading;

  readonly selectedId = this.selectedIncidentId.asReadonly();

  readonly selectedIncident = computed(() =>
    this.incidentList().find((incident) => incident.id === this.selectedIncidentId()),
  );

  // Indicadores: sobre la colección completa, no sobre lo filtrado.
  readonly totalCount = computed(() => this.incidentList().length);

  readonly criticalCount = computed(
    () => this.incidentList().filter((incident) => incident.priority === 'CRITICAL').length,
  );

  readonly openCount = computed(
    () => this.incidentList().filter((incident) => incident.status === 'OPEN').length,
  );

  readonly hasActiveFilters = computed(() => {
    const { search, status, priority } = this.activeFilters();
    return search.trim() !== '' || status !== ANY || priority !== ANY;
  });

  /**
   * Lo que se pinta: los resultados de la búsqueda cruzados con la colección
   * viva y pasados por los filtros locales.
   *
   * Sin término de búsqueda se parte de la colección completa, que ya está
   * cargada; con término, de lo que respondió el servidor. El cruce con la
   * colección hace que eliminar surta efecto sin repetir la búsqueda.
   */
  readonly visibleIncidents = computed(() => {
    const { search, status, priority } = this.activeFilters();
    const base = search.trim() ? this.searchResults() : this.incidentList();
    const alive = new Set(this.incidentList().map((incident) => incident.id));

    return base.filter(
      (incident) =>
        alive.has(incident.id) &&
        (status === ANY || incident.status === status) &&
        (priority === ANY || incident.priority === priority),
    );
  });

  readonly visibleCount = computed(() => this.visibleIncidents().length);

  constructor() {
    this.load();
  }

  // --- Acciones ------------------------------------------------------------
  //
  // La única forma de cambiar el estado. Cada una describe una intención,
  // no una asignación: `select(id)`, no `setSelectedId(id)`.

  /** Recarga la colección desde el servidor. */
  load(): void {
    this.track(this.api.getAll()).subscribe({
      next: (incidents) => {
        this.incidentList.set(incidents);
        this.initialized.set(true);
      },
      error: () => this.initialized.set(true),
    });
  }

  /** Registra una incidencia. El id, las fechas y el estado los pone aquí. */
  create(draft: IncidentDraft): Observable<Incident> {
    const now = new Date().toISOString();
    const incident: Incident = {
      ...draft,
      id: this.nextId(),
      status: draft.status ?? 'OPEN',
      createdAt: now,
      updatedAt: now,
    };

    return this.track(this.api.create(incident)).pipe(
      tap((created) => this.incidentList.update((current) => [...current, created])),
    );
  }

  /** Aplica cambios parciales a una incidencia ya registrada. */
  update(id: string, changes: IncidentChanges): Observable<Incident> {
    const current = this.getById(id);

    if (!current) {
      return this.track(this.api.getById(id));
    }

    const updated: Incident = {
      ...current,
      ...changes,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };

    return this.track(this.api.update(updated)).pipe(
      tap((saved) =>
        this.incidentList.update((incidents) =>
          incidents.map((incident) => (incident.id === id ? saved : incident)),
        ),
      ),
    );
  }

  /** Elimina una incidencia. */
  remove(id: string): Observable<void> {
    return this.track(this.api.remove(id)).pipe(
      tap(() => {
        this.incidentList.update((current) => current.filter((incident) => incident.id !== id));
        // Si la eliminada estaba seleccionada, la selección deja de tener sentido.
        if (this.selectedIncidentId() === id) {
          this.selectedIncidentId.set(null);
        }
      }),
    );
  }

  /** Alterna la selección: volver a seleccionar la misma la deselecciona. */
  select(id: string): void {
    this.selectedIncidentId.update((current) => (current === id ? null : id));
  }

  clearSelection(): void {
    this.selectedIncidentId.set(null);
  }

  /** Cambia uno o varios filtros, conservando el resto. */
  setFilters(changes: Partial<IncidentFilters>): void {
    this.activeFilters.update((current) => ({ ...current, ...changes }));
  }

  clearFilters(): void {
    this.activeFilters.set(NO_FILTERS);
  }

  /** Guarda lo que devolvió el servidor para el término de búsqueda actual. */
  setSearchResults(results: readonly Incident[]): void {
    this.searchResults.set(results);
  }

  clearError(): void {
    this.lastError.set(null);
  }

  setError(message: string): void {
    this.lastError.set(message);
  }

  // --- Consulta ------------------------------------------------------------

  /** Busca en la colección ya cargada. `undefined` si no está. */
  getById(id: string): Incident | undefined {
    return this.incidentList().find((incident) => incident.id === id);
  }

  /** Todas las incidencias cargadas, en un arreglo nuevo. */
  getAll(): readonly Incident[] {
    return [...this.incidentList()];
  }

  // --- Interno -------------------------------------------------------------

  /** Registra el último error. El mensaje ya viene traducido (Día 18). */
  private track<T>(source: Observable<T>): Observable<T> {
    this.lastError.set(null);

    return source.pipe(tap({ error: (error: Error) => this.lastError.set(error.message) }));
  }

  /** Siguiente identificador correlativo (`inc-006`, `inc-007`, …). */
  private nextId(): string {
    const highest = this.incidentList().reduce((max, incident) => {
      const value = Number.parseInt(incident.id.replace(/\D/g, ''), 10);
      return Number.isNaN(value) ? max : Math.max(max, value);
    }, 0);

    return `inc-${String(highest + 1).padStart(3, '0')}`;
  }
}
