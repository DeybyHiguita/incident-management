import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IncidentService } from '../../../../core/services/incident-service';
import { IncidentPriorityPipe } from '../../../../shared/pipes/incident-priority-pipe';
import { IncidentHighlight } from '../../../../shared/directives/incident-highlight';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, IncidentPriorityPipe, IncidentHighlight],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly incidentService = inject(IncidentService);

  // Los mismos indicadores del Día 10, leídos del servicio. No se recalculan
  // aquí: se reutiliza el estado derivado que ya existe.
  protected readonly totalCount = this.incidentService.totalCount;
  protected readonly criticalCount = this.incidentService.criticalCount;
  protected readonly openCount = this.incidentService.openCount;

  /** Las críticas, para ofrecer un acceso directo a lo urgente. */
  protected readonly criticalIncidents = computed(() =>
    this.incidentService.incidents().filter((incident) => incident.priority === 'CRITICAL'),
  );
}
