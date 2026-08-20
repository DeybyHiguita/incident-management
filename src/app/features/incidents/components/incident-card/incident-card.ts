import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe, LowerCasePipe, TitleCasePipe, UpperCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Incident } from '../../../../core/models/incident.model';
import { IncidentPriorityPipe } from '../../../../shared/pipes/incident-priority-pipe';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time-pipe';
import { IncidentHighlight } from '../../../../shared/directives/incident-highlight';
import { FocusWithin } from '../../../../shared/directives/focus-within';

@Component({
  selector: 'app-incident-card',
  imports: [
    DatePipe,
    LowerCasePipe,
    TitleCasePipe,
    UpperCasePipe,
    IncidentPriorityPipe,
    RelativeTimePipe,
    IncidentHighlight,
    FocusWithin,
    RouterLink,
  ],
  templateUrl: './incident-card.html',
  styleUrl: './incident-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentCard {
  /** Incidencia a representar. Requerida: la tarjeta no existe sin ella. */
  readonly incident = input.required<Incident>();

  /** Marca la tarjeta como seleccionada. Opcional, `false` por defecto. */
  readonly selected = input(false);

  /**
   * Ruta al detalle, ya construida por quien usa la tarjeta. Si no se pasa,
   * no se muestra el enlace. Así la tarjeta sigue sin conocer las
   * direcciones de la aplicación y se puede reutilizar en cualquier parte.
   *
   * Es una **cadena** y no un arreglo de segmentos a propósito: con
   * `OnPush`, `['/incidents', id]` crea una referencia nueva en cada ciclo
   * y el input se considera cambiado siempre. Dos cadenas iguales, en
   * cambio, son `===`.
   */
  readonly detailLink = input<string | null>(null);

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
