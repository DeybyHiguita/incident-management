import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { UpperCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { Incident, IncidentPriority, IncidentStatus } from '../../../../core/models/incident.model';
import { IncidentApi } from '../../../../core/api/incident-api';
import { IncidentService } from '../../../../core/services/incident-service';
import { IncidentCard } from '../../components/incident-card/incident-card';
import { IncidentPriorityPipe } from '../../../../shared/pipes/incident-priority-pipe';
import { IncidentHighlight } from '../../../../shared/directives/incident-highlight';

/** Valor de los selectores cuando no se filtra por ese campo. */
const ANY = '';

/** Espera antes de consultar al servidor, en milisegundos. */
const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-incident-list',
  imports: [IncidentCard, UpperCasePipe, IncidentPriorityPipe, IncidentHighlight, RouterLink],
  templateUrl: './incident-list.html',
  styleUrl: './incident-list.scss',
})
export class IncidentList {
  private readonly incidentService = inject(IncidentService);
  private readonly incidentApi = inject(IncidentApi);

  // --- Estado del dominio (vive en el servicio) ----------------------------

  protected readonly incidents = this.incidentService.incidents;
  protected readonly totalCount = this.incidentService.totalCount;
  protected readonly criticalCount = this.incidentService.criticalCount;
  protected readonly openCount = this.incidentService.openCount;
  protected readonly loading = this.incidentService.loading;
  protected readonly error = this.incidentService.error;
  protected readonly loaded = this.incidentService.loaded;

  // --- Estado de esta vista (vive aquí) ------------------------------------

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<IncidentStatus | typeof ANY>(ANY);
  protected readonly priorityFilter = signal<IncidentPriority | typeof ANY>(ANY);
  protected readonly selectedId = signal<string | null>(null);

  /** `true` mientras hay una búsqueda en vuelo. */
  protected readonly searching = signal(false);

  /** Mensaje si la búsqueda falla. No rompe el flujo: se sigue pudiendo buscar. */
  protected readonly searchError = signal<string | null>(null);

  // --- Búsqueda reactiva ---------------------------------------------------

  /**
   * Resultados que devuelve el servidor para el término actual.
   *
   * El flujo va de señal a señal pasando por RxJS: `toObservable` convierte
   * la caja de texto en un flujo de valores, los operadores lo domestican y
   * `toSignal` devuelve el resultado al mundo de las señales, sin ninguna
   * suscripción manual que haya que cancelar después.
   */
  private readonly searchResults = toSignal(
    toObservable(this.searchTerm).pipe(
      // 1. Espera: no se consulta en cada tecla, solo cuando el usuario para.
      debounceTime(SEARCH_DEBOUNCE_MS),
      map((term) => term.trim()),
      // 2. Sin duplicadas: escribir «red » y volver a «red» no repite la
      //    petición, porque el término efectivo no ha cambiado.
      distinctUntilChanged(),
      // Un término vacío no se consulta: para eso ya está la colección
      // completa que el servicio cargó al arrancar.
      filter((term) => term !== ''),
      tap(() => {
        this.searching.set(true);
        this.searchError.set(null);
      }),
      // 3. Cancelación: switchMap descarta la petición anterior en cuanto
      //    llega un término nuevo, así que una respuesta lenta y vieja nunca
      //    puede sobrescribir a una reciente.
      switchMap((term) =>
        this.incidentApi.search(term).pipe(
          // 4. El error se atiende DENTRO del switchMap: así muere la
          //    petición fallida, no el flujo de búsqueda. Si el catchError
          //    estuviera fuera, un fallo dejaría la caja de texto muerta.
          catchError((failure: Error) => {
            this.searchError.set(failure.message);
            return of<Incident[]>([]);
          }),
        ),
      ),
      tap(() => this.searching.set(false)),
    ),
    { initialValue: [] as Incident[] },
  );

  // --- Valores derivados ---------------------------------------------------

  /**
   * Lo que se pinta: los resultados del servidor, cruzados con la colección
   * viva y pasados por los filtros locales.
   *
   * El cruce con la colección es lo que hace que al eliminar una incidencia
   * desaparezca al instante, sin repetir la búsqueda.
   */
  protected readonly visibleIncidents = computed(() => {
    const term = this.searchTerm().trim();
    const status = this.statusFilter();
    const priority = this.priorityFilter();

    // Sin término no hace falta preguntar: se parte de lo ya cargado. Con
    // término, de lo que respondió el servidor.
    const base = term ? this.searchResults() : this.incidents();
    const alive = new Set(this.incidents().map((incident) => incident.id));

    return base.filter(
      (incident) =>
        alive.has(incident.id) &&
        (status === ANY || incident.status === status) &&
        (priority === ANY || incident.priority === priority),
    );
  });

  protected readonly visibleCount = computed(() => this.visibleIncidents().length);

  protected readonly hasActiveFilters = computed(
    () =>
      this.searchTerm().trim() !== '' ||
      this.statusFilter() !== ANY ||
      this.priorityFilter() !== ANY,
  );

  protected readonly selectedIncident = computed(() =>
    this.incidents().find((incident) => incident.id === this.selectedId()),
  );

  // --- Acciones ------------------------------------------------------------

  protected onSearchTermChange(value: string): void {
    this.searchTerm.set(value);
  }

  protected onStatusFilterChange(value: string): void {
    this.statusFilter.set(value as IncidentStatus | typeof ANY);
  }

  protected onPriorityFilterChange(value: string): void {
    this.priorityFilter.set(value as IncidentPriority | typeof ANY);
  }

  protected clearFilters(): void {
    this.searchTerm.set(ANY);
    this.statusFilter.set(ANY);
    this.priorityFilter.set(ANY);
  }

  protected onIncidentSelected(incident: Incident): void {
    this.selectedId.update((current) => (current === incident.id ? null : incident.id));
  }

  protected onDeleteRequested(incident: Incident): void {
    this.incidentService.remove(incident.id).subscribe({ error: () => undefined });
  }

  protected reload(): void {
    this.incidentService.load();
  }
}
