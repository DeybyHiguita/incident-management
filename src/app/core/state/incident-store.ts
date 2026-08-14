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
  readonly category: string;
}

const NO_FILTERS: IncidentFilters = {
  search: ANY,
  status: ANY,
  priority: ANY,
  category: ANY,
};

/** Campos por los que se puede ordenar. */
export type SortField = 'createdAt' | 'priority';

export type SortDirection = 'asc' | 'desc';

export interface IncidentSort {
  readonly field: SortField;
  readonly direction: SortDirection;
}

/** Por defecto, lo más reciente primero: es lo que se suele querer ver. */
const DEFAULT_SORT: IncidentSort = { field: 'createdAt', direction: 'desc' };

/**
 * Peso de cada prioridad para poder ordenarlas.
 *
 * Alfabéticamente el orden sería CRITICAL, HIGH, LOW, MEDIUM, que no
 * significa nada. Este mapa define el orden **de gravedad**, que es el que
 * el usuario espera.
 */
const PRIORITY_RANK: Readonly<Record<IncidentPriority, number>> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

/**
 * Incidencias por página.
 *
 * Cuatro es un número pequeño a propósito: con el conjunto de datos
 * simulado (cinco incidencias) permite ver la paginación funcionando.
 */
export const DEFAULT_PAGE_SIZE = 4;

/** Tamaños de página que puede elegir el usuario. */
export const PAGE_SIZES = [4, 8, 12] as const;

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
  private readonly activeSort = signal<IncidentSort>(DEFAULT_SORT);
  private readonly currentPage = signal(1);
  private readonly currentPageSize = signal<number>(DEFAULT_PAGE_SIZE);
  /** Resultados que devolvió el servidor para el término de búsqueda. */
  private readonly searchResults = signal<readonly Incident[]>([]);

  // --- Selectores ----------------------------------------------------------
  //
  // Señales de solo lectura y valores derivados. Es todo lo que ve la vista.

  readonly incidents = this.incidentList.asReadonly();
  readonly filters = this.activeFilters.asReadonly();
  readonly sort = this.activeSort.asReadonly();
  readonly page = this.currentPage.asReadonly();
  readonly pageSize = this.currentPageSize.asReadonly();
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
    const { search, status, priority, category } = this.activeFilters();
    return search.trim() !== '' || status !== ANY || priority !== ANY || category !== ANY;
  });

  /**
   * Categorías disponibles, derivadas de las propias incidencias.
   *
   * No hay una lista maestra de categorías: se calculan de lo que hay. Así,
   * al registrar una incidencia con una categoría nueva, aparece sola en el
   * filtro.
   */
  readonly categories = computed(() =>
    [...new Set(this.incidentList().map((incident) => incident.category))].sort((a, b) =>
      a.localeCompare(b, 'es'),
    ),
  );

  /**
   * Lo que se pinta: los resultados de la búsqueda cruzados con la colección
   * viva y pasados por los filtros locales.
   *
   * Sin término de búsqueda se parte de la colección completa, que ya está
   * cargada; con término, de lo que respondió el servidor. El cruce con la
   * colección hace que eliminar surta efecto sin repetir la búsqueda.
   */
  readonly visibleIncidents = computed(() => {
    const { search, status, priority, category } = this.activeFilters();
    const base = search.trim() ? this.searchResults() : this.incidentList();
    const alive = new Set(this.incidentList().map((incident) => incident.id));

    const filtered = base.filter(
      (incident) =>
        alive.has(incident.id) &&
        (status === ANY || incident.status === status) &&
        (priority === ANY || incident.priority === priority) &&
        (category === ANY || incident.category === category),
    );

    return this.applySort(filtered);
  });

  /** Número total de resultados que cumplen los filtros, sin paginar. */
  readonly visibleCount = computed(() => this.visibleIncidents().length);

  // --- Paginación ----------------------------------------------------------

  readonly totalPages = computed(() =>
    // Siempre al menos una página, aunque no haya resultados: «página 1 de 1»
    // se entiende mejor que «página 1 de 0».
    Math.max(1, Math.ceil(this.visibleCount() / this.currentPageSize())),
  );

  /**
   * Página efectiva.
   *
   * Se recorta contra el total en vez de corregir `currentPage` al filtrar:
   * si el usuario está en la página 3 y un filtro deja una sola página,
   * verá la 1 sin que haya hecho falta reaccionar a nada.
   */
  readonly currentPageNumber = computed(() =>
    Math.min(Math.max(1, this.currentPage()), this.totalPages()),
  );

  /** Las incidencias de la página actual: esto es lo que se pinta. */
  readonly pagedIncidents = computed(() => {
    const size = this.currentPageSize();
    const start = (this.currentPageNumber() - 1) * size;

    return this.visibleIncidents().slice(start, start + size);
  });

  readonly hasPreviousPage = computed(() => this.currentPageNumber() > 1);
  readonly hasNextPage = computed(() => this.currentPageNumber() < this.totalPages());

  /** Rango mostrado, para el texto «mostrando 1–4 de 12». */
  readonly pageRange = computed(() => {
    const total = this.visibleCount();

    if (total === 0) {
      return { from: 0, to: 0 };
    }

    const size = this.currentPageSize();
    const from = (this.currentPageNumber() - 1) * size + 1;

    return { from, to: Math.min(from + size - 1, total) };
  });

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

  /**
   * Cambia uno o varios filtros, conservando el resto.
   *
   * Vuelve a la primera página: seguir en la página 3 tras cambiar un
   * filtro es desconcertante, porque los resultados son otros.
   */
  setFilters(changes: Partial<IncidentFilters>): void {
    this.activeFilters.update((current) => ({ ...current, ...changes }));
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.activeFilters.set(NO_FILTERS);
    this.currentPage.set(1);
  }

  /** Cambia el criterio de ordenación. También vuelve a la primera página. */
  setSort(sort: IncidentSort): void {
    this.activeSort.set(sort);
    this.currentPage.set(1);
  }

  /**
   * Ordena por un campo. Si ya se ordenaba por él, invierte la dirección —
   * que es lo que espera quien pulsa dos veces la misma cabecera.
   */
  toggleSort(field: SortField): void {
    this.activeSort.update((current) =>
      current.field === field
        ? { field, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: 'desc' },
    );
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.currentPage.set(Math.max(1, Math.min(page, this.totalPages())));
  }

  nextPage(): void {
    this.goToPage(this.currentPageNumber() + 1);
  }

  previousPage(): void {
    this.goToPage(this.currentPageNumber() - 1);
  }

  setPageSize(size: number): void {
    this.currentPageSize.set(Math.max(1, size));
    this.currentPage.set(1);
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

  /**
   * Ordena una copia, nunca el arreglo recibido.
   *
   * `sort` muta en su sitio, así que ordenar directamente el resultado de
   * un `computed` corrompería el estado del que deriva.
   */
  private applySort(incidents: readonly Incident[]): readonly Incident[] {
    const { field, direction } = this.activeSort();
    const factor = direction === 'asc' ? 1 : -1;

    return [...incidents].sort((a, b) => {
      const comparison =
        field === 'priority'
          ? PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
          : Date.parse(a.createdAt) - Date.parse(b.createdAt);

      // Desempate estable por id: dos incidencias con la misma prioridad
      // siempre salen en el mismo orden, sin bailes entre renders.
      return comparison !== 0 ? comparison * factor : a.id.localeCompare(b.id);
    });
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
