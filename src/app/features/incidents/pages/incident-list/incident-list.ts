import { Component, computed, signal } from '@angular/core';
import { Incident } from '../../../../core/models/incident.model';
import { MOCK_INCIDENTS } from '../../../../core/mocks/incidents.mock';
import { IncidentCard } from '../../components/incident-card/incident-card';

@Component({
  selector: 'app-incident-list',
  imports: [IncidentCard],
  templateUrl: './incident-list.html',
  styleUrl: './incident-list.scss',
})
export class IncidentList {
  /** El contenedor es el único dueño de la colección. */
  protected readonly incidents = signal<readonly Incident[]>(MOCK_INCIDENTS);

  /** Guardamos el id, no el objeto: así la selección sigue siendo válida si la colección cambia. */
  protected readonly selectedId = signal<string | null>(null);

  protected readonly selectedIncident = computed(() =>
    this.incidents().find((incident) => incident.id === this.selectedId()),
  );

  protected readonly isRestoreDisabled = computed(
    () => this.incidents().length === MOCK_INCIDENTS.length,
  );

  protected onIncidentSelected(incident: Incident): void {
    this.selectedId.update((current) => (current === incident.id ? null : incident.id));
  }

  protected onDeleteRequested(incident: Incident): void {
    // Se crea un arreglo nuevo en lugar de mutar el existente (inmutabilidad).
    this.incidents.update((current) => current.filter((item) => item.id !== incident.id));
  }

  protected restoreIncidents(): void {
    this.incidents.set(MOCK_INCIDENTS);
  }
}
