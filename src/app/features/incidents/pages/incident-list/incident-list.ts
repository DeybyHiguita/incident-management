import { Component, computed, inject, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { Incident } from '../../../../core/models/incident.model';
import { IncidentService } from '../../../../core/services/incident-service';
import { IncidentCard } from '../../components/incident-card/incident-card';
import { IncidentPriorityPipe } from '../../../../shared/pipes/incident-priority-pipe';
import { IncidentHighlight } from '../../../../shared/directives/incident-highlight';

@Component({
  selector: 'app-incident-list',
  imports: [IncidentCard, UpperCasePipe, IncidentPriorityPipe, IncidentHighlight],
  templateUrl: './incident-list.html',
  styleUrl: './incident-list.scss',
})
export class IncidentList {
  /**
   * El componente ya no posee los datos: los pide al servicio. No sabe si
   * vienen de memoria, de una API o de una base de datos local.
   */
  private readonly incidentService = inject(IncidentService);

  /** Vista de solo lectura que expone el servicio. */
  protected readonly incidents = this.incidentService.incidents;

  /** La selección sí es estado de la vista, así que se queda aquí. */
  protected readonly selectedId = signal<string | null>(null);

  protected readonly selectedIncident = computed(() =>
    this.incidents().find((incident) => incident.id === this.selectedId()),
  );

  protected readonly isRestoreDisabled = computed(() => this.incidentService.isPristine());

  protected onIncidentSelected(incident: Incident): void {
    this.selectedId.update((current) => (current === incident.id ? null : incident.id));
  }

  protected onDeleteRequested(incident: Incident): void {
    // Quien decide cómo se elimina es el servicio; el componente solo avisa.
    this.incidentService.remove(incident.id);
  }

  protected restoreIncidents(): void {
    this.incidentService.reset();
  }
}
