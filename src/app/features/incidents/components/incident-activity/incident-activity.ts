import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Incident } from '../../../../core/models/incident.model';
import { UserService } from '../../../../core/services/user-service';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time-pipe';

/** Una entrada de la traza de la incidencia. */
interface ActivityEntry {
  readonly label: string;
  readonly at: string;
  readonly by: string;
}

/**
 * Traza de una incidencia: qué le ha pasado y cuándo.
 *
 * Es información **secundaria**: quien abre el detalle quiere leer el
 * problema, no su historial. Por eso se difiere hasta que entra en
 * pantalla, y solo se usa dentro de su bloque `@defer`.
 */
@Component({
  selector: 'app-incident-activity',
  imports: [DatePipe, RelativeTimePipe],
  templateUrl: './incident-activity.html',
  styleUrl: './incident-activity.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentActivity {
  private readonly userService = inject(UserService);

  readonly incident = input.required<Incident>();

  /**
   * Entradas de la traza, derivadas de las marcas de tiempo.
   *
   * No hay un historial real en el modelo: se reconstruye con lo que se
   * sabe. Si algún día el servidor devuelve eventos, este componente es el
   * único que cambia.
   */
  protected readonly entries = computed<ActivityEntry[]>(() => {
    const incident = this.incident();
    const reporter = this.nameOf(incident.reporterId);

    const timeline: ActivityEntry[] = [
      { label: 'Incidencia registrada', at: incident.createdAt, by: reporter },
    ];

    if (incident.assignedAgentId) {
      timeline.push({
        label: 'Asignada a un agente',
        at: incident.updatedAt,
        by: this.nameOf(incident.assignedAgentId),
      });
    }

    // Solo se muestra como cambio si de verdad hubo uno.
    if (incident.updatedAt !== incident.createdAt) {
      timeline.push({ label: 'Última actualización', at: incident.updatedAt, by: reporter });
    }

    return timeline;
  });

  private nameOf(userId: string): string {
    return this.userService.getById(userId)?.name ?? userId;
  }
}
