import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { UpperCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
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
import { ANY, IncidentStore } from '../../../../core/state/incident-store';
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
    // `toSignal` necesita que alguien lea la señal para que el flujo corra.
    this.search();

    this.startAutoRefresh();
    this.reloadWhenBackOnline();
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

  protected clearFilters(): void {
    this.store.clearFilters();
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
