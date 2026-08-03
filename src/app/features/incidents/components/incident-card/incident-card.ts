import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Incident } from '../../../../core/models/incident.model';

@Component({
  selector: 'app-incident-card',
  imports: [],
  templateUrl: './incident-card.html',
  styleUrl: './incident-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentCard {
  /** Incidencia a representar. Requerida: la tarjeta no existe sin ella. */
  readonly incident = input.required<Incident>();

  /** Marca la tarjeta como seleccionada. Opcional, `false` por defecto. */
  readonly selected = input(false);

  /** El usuario seleccionó la incidencia. */
  readonly incidentSelected = output<Incident>();

  /** El usuario pidió eliminarla: el hijo avisa, no elimina nada. */
  readonly deleteRequested = output<Incident>();

  protected onSelect(): void {
    this.incidentSelected.emit(this.incident());
  }

  protected onDelete(): void {
    this.deleteRequested.emit(this.incident());
  }
}
