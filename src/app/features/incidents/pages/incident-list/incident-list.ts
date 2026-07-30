import { Component, signal } from '@angular/core';
import { Incident } from '../../../../core/models/incident.model';
import { MOCK_INCIDENTS } from '../../../../core/mocks/incidents.mock';

@Component({
  selector: 'app-incident-list',
  imports: [],
  templateUrl: './incident-list.html',
  styleUrl: './incident-list.scss',
})
export class IncidentList {
  protected readonly incidents = signal<readonly Incident[]>(MOCK_INCIDENTS);

  protected toggleIncidents(): void {
    this.incidents.update((current) => (current.length > 0 ? [] : MOCK_INCIDENTS));
  }
}
