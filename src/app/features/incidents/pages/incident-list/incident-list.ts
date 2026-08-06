import { Component, computed, inject, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import {
  Incident,
  IncidentPriority,
  IncidentStatus,
} from '../../../../core/models/incident.model';
import { IncidentSearchCriteria } from '../../../../core/models/incident-search-criteria.model';
import { IncidentService } from '../../../../core/services/incident-service';
import { IncidentCard } from '../../components/incident-card/incident-card';
import { IncidentPriorityPipe } from '../../../../shared/pipes/incident-priority-pipe';
import { IncidentHighlight } from '../../../../shared/directives/incident-highlight';

/** Valor de los selectores cuando no se filtra por ese campo. */
const ANY = '';

@Component({
  selector: 'app-incident-list',
  imports: [IncidentCard, UpperCasePipe, IncidentPriorityPipe, IncidentHighlight],
  templateUrl: './incident-list.html',
  styleUrl: './incident-list.scss',
})
export class IncidentList {
  private readonly incidentService = inject(IncidentService);

  // --- Estado del dominio (vive en el servicio) ----------------------------

  protected readonly incidents = this.incidentService.incidents;
  protected readonly totalCount = this.incidentService.totalCount;
  protected readonly criticalCount = this.incidentService.criticalCount;
  protected readonly openCount = this.incidentService.openCount;

  // --- Estado de esta vista (vive aquí) ------------------------------------
  //
  // Los filtros son de la pantalla, no del dominio: dos listados abiertos a
  // la vez podrían filtrar distinto sobre las mismas incidencias.

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<IncidentStatus | typeof ANY>(ANY);
  protected readonly priorityFilter = signal<IncidentPriority | typeof ANY>(ANY);
  protected readonly selectedId = signal<string | null>(null);

  // --- Valores derivados ---------------------------------------------------
  //
  // Nada de esto se guarda: todo se calcula. Al escribir en la caja de
  // búsqueda solo cambia `searchTerm`, y la cascada se recalcula sola.

  /** Criterios del Día 2, construidos a partir de los tres filtros. */
  protected readonly criteria = computed(
    () =>
      new IncidentSearchCriteria(
        this.searchTerm(),
        this.statusFilter() || undefined,
        this.priorityFilter() || undefined,
      ),
  );

  /** Lo que realmente se pinta: la colección pasada por los criterios. */
  protected readonly visibleIncidents = computed(() => {
    const criteria = this.criteria();
    return this.incidents().filter((incident) => criteria.matches(incident));
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

  protected readonly isRestoreDisabled = computed(() => this.incidentService.isPristine());

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
    this.incidentService.remove(incident.id);
  }

  protected restoreIncidents(): void {
    this.incidentService.reset();
  }
}
