import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { UpperCasePipe } from '@angular/common';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import {
  EMPTY,
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  interval,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { Incident, IncidentPriority, IncidentStatus } from '../../../../core/models/incident.model';
import { IncidentApi } from '../../../../core/api/incident-api';
import {
  ANY,
  IncidentStore,
  PAGE_SIZES,
  SortDirection,
  SortField,
} from '../../../../core/state/incident-store';
import { IncidentCard } from '../../components/incident-card/incident-card';
import { IncidentPriorityPipe } from '../../../../shared/pipes/incident-priority-pipe';
import { IncidentHighlight } from '../../../../shared/directives/incident-highlight';

/** Espera antes de consultar al servidor, en milisegundos. */
const SEARCH_DEBOUNCE_MS = 300;

/** Periodo del refresco automático, en milisegundos. */
const AUTO_REFRESH_MS = 30_000;

@Component({
  selector: 'app-incident-list',
  imports: [IncidentCard, UpperCasePipe, IncidentPriorityPipe, IncidentHighlight, RouterLink],
  templateUrl: './incident-list.html',
  styleUrl: './incident-list.scss',
})
export class IncidentList {
  private readonly store = inject(IncidentStore);
  private readonly incidentApi = inject(IncidentApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // --- Lectura del estado --------------------------------------------------
  //
  // Todo son señales de solo lectura del store. El componente **no puede**
  // escribir en el estado: para eso llama a una acción.

  protected readonly incidents = this.store.incidents;
  protected readonly visibleIncidents = this.store.visibleIncidents;
  protected readonly visibleCount = this.store.visibleCount;
  protected readonly totalCount = this.store.totalCount;
  protected readonly criticalCount = this.store.criticalCount;
  protected readonly openCount = this.store.openCount;
  protected readonly selectedId = this.store.selectedId;
  protected readonly selectedIncident = this.store.selectedIncident;
  protected readonly hasActiveFilters = this.store.hasActiveFilters;
  protected readonly categories = this.store.categories;
  protected readonly sort = this.store.sort;
  protected readonly pagedIncidents = this.store.pagedIncidents;
  protected readonly totalPages = this.store.totalPages;
  protected readonly currentPageNumber = this.store.currentPageNumber;
  protected readonly hasPreviousPage = this.store.hasPreviousPage;
  protected readonly hasNextPage = this.store.hasNextPage;
  protected readonly pageRange = this.store.pageRange;
  protected readonly pageSize = this.store.pageSize;
  protected readonly pageSizes = PAGE_SIZES;
  protected readonly filters = this.store.filters;
  protected readonly loading = this.store.loading;
  protected readonly error = this.store.error;
  protected readonly loaded = this.store.loaded;

  /** Estado puramente visual: no describe el dominio, no va al store. */
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);
  protected readonly autoRefresh = signal(false);

  // --- Búsqueda reactiva ---------------------------------------------------

  /**
   * El flujo RxJS se queda en el componente, no en el store.
   *
   * La espera de 300 ms y la cancelación son decisiones de **interacción**
   * —dependen de lo rápido que teclee una persona—, no del dominio. El
   * store solo recibe el resultado a través de una acción.
   */
  private readonly search = toSignal(
    toObservable(computed(() => this.filters().search)).pipe(
      debounceTime(SEARCH_DEBOUNCE_MS),
      map((term) => term.trim()),
      distinctUntilChanged(),
      filter((term) => term !== ''),
      tap(() => {
        this.searching.set(true);
        this.searchError.set(null);
      }),
      switchMap((term) =>
        this.incidentApi.search(term).pipe(
          catchError((failure: Error) => {
            this.searchError.set(failure.message);
            return of<Incident[]>([]);
          }),
        ),
      ),
      tap((results) => {
        this.searching.set(false);
        this.store.setSearchResults(results);
      }),
    ),
    { initialValue: [] as Incident[] },
  );

  constructor() {
    // El orden importa: primero se aplica lo que traiga la URL, y solo
    // después se empieza a escribirla.
    this.applyFiltersFromUrl();

    // `toSignal` necesita que alguien lea la señal para que el flujo corra.
    this.search();

    this.syncUrlWithState();
    this.startAutoRefresh();
    this.reloadWhenBackOnline();
  }

  // --- Sincronización con la URL -------------------------------------------
  //
  // Vive aquí y no en el store: el estado del dominio no debe saber que
  // existe un enrutador. El store guarda filtros; la URL es una forma de
  // presentarlos.

  /** Lee los parámetros de consulta al entrar y los vuelca en el store. */
  private applyFiltersFromUrl(): void {
    const params = this.route.snapshot.queryParamMap;

    this.store.setFilters({
      search: params.get('q') ?? ANY,
      status: (params.get('estado') ?? ANY) as IncidentStatus | typeof ANY,
      priority: (params.get('prioridad') ?? ANY) as IncidentPriority | typeof ANY,
      category: params.get('categoria') ?? ANY,
    });

    const field = params.get('orden') as SortField | null;
    const direction = params.get('dir') as SortDirection | null;
    if (field === 'createdAt' || field === 'priority') {
      this.store.setSort({ field, direction: direction === 'asc' ? 'asc' : 'desc' });
    }

    const page = Number.parseInt(params.get('pagina') ?? '', 10);
    if (Number.isFinite(page) && page > 0) {
      this.store.goToPage(page);
    }
  }

  /**
   * Escribe el estado en la URL cada vez que cambia.
   *
   * Es un `effect` legítimo —de los que describía el Día 10—: no calcula un
   * valor para la plantilla, sincroniza con algo que vive fuera del sistema
   * reactivo, en este caso la barra de direcciones.
   *
   * `replaceUrl` evita llenar el historial: filtrar no debería obligar a
   * pulsar «atrás» quince veces para salir de la pantalla.
   */
  private syncUrlWithState(): void {
    effect(() => {
      const { search, status, priority, category } = this.store.filters();
      const { field, direction } = this.store.sort();
      const page = this.store.currentPageNumber();

      const queryParams: Params = {
        q: search.trim() || null,
        estado: status || null,
        prioridad: priority || null,
        categoria: category || null,
        // Solo se escribe el orden si no es el de por defecto.
        orden: field === 'createdAt' && direction === 'desc' ? null : field,
        dir: field === 'createdAt' && direction === 'desc' ? null : direction,
        pagina: page > 1 ? page : null,
      };

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams,
        replaceUrl: true,
      });
    });
  }

  // --- Acciones: siempre a través del store --------------------------------

  protected onSearchTermChange(value: string): void {
    this.store.setFilters({ search: value });
  }

  protected onStatusFilterChange(value: string): void {
    this.store.setFilters({ status: value as IncidentStatus | typeof ANY });
  }

  protected onPriorityFilterChange(value: string): void {
    this.store.setFilters({ priority: value as IncidentPriority | typeof ANY });
  }

  protected onCategoryFilterChange(value: string): void {
    this.store.setFilters({ category: value });
  }

  protected clearFilters(): void {
    this.store.clearFilters();
  }

  protected onSortChange(value: string): void {
    const [field, direction] = value.split(':') as [SortField, SortDirection];
    this.store.setSort({ field, direction });
  }

  protected onPageSizeChange(value: string): void {
    this.store.setPageSize(Number.parseInt(value, 10));
  }

  protected previousPage(): void {
    this.store.previousPage();
  }

  protected nextPage(): void {
    this.store.nextPage();
  }

  protected onIncidentSelected(incident: Incident): void {
    this.store.select(incident.id);
  }

  protected onDeleteRequested(incident: Incident): void {
    this.store
      .remove(incident.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }

  protected reload(): void {
    this.store.load();
  }

  protected toggleAutoRefresh(): void {
    this.autoRefresh.update((enabled) => !enabled);
  }

  // --- Ciclo de vida -------------------------------------------------------

  /**
   * Temporizador controlado: el `interval` solo existe mientras el refresco
   * está activo, y `takeUntilDestroyed` lo corta con el componente.
   */
  private startAutoRefresh(): void {
    toObservable(this.autoRefresh)
      .pipe(
        switchMap((enabled) => (enabled ? interval(AUTO_REFRESH_MS) : EMPTY)),
        filter(() => !this.loading()),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.store.load());
  }

  /** `addEventListener` no lo limpia Angular: la baja se registra a mano. */
  private reloadWhenBackOnline(): void {
    const onOnline = () => this.store.load();

    window.addEventListener('online', onOnline);
    this.destroyRef.onDestroy(() => window.removeEventListener('online', onOnline));
  }
}
