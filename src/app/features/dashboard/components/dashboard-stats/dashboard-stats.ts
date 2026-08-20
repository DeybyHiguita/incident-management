import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IncidentStore } from '../../../../core/state/incident-store';
import { IncidentStatus } from '../../../../core/models/incident.model';

/** Etiqueta legible de cada estado, para el desglose. */
const STATUS_LABELS: Readonly<Record<IncidentStatus, string>> = {
  OPEN: 'Abiertas',
  IN_PROGRESS: 'En progreso',
  RESOLVED: 'Resueltas',
  CLOSED: 'Cerradas',
};

/**
 * Panel de indicadores del dashboard.
 *
 * Se separó en su propio componente para poder **diferirlo**: es lo más
 * costoso de la pantalla y no es lo primero que hay que ver. Solo se usa
 * dentro del bloque `@defer`, que es la condición para que acabe en un
 * fragmento propio.
 */
@Component({
  selector: 'app-dashboard-stats',
  imports: [],
  templateUrl: './dashboard-stats.html',
  styleUrl: './dashboard-stats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardStats {
  private readonly store = inject(IncidentStore);

  protected readonly totalCount = this.store.totalCount;
  protected readonly criticalCount = this.store.criticalCount;
  protected readonly openCount = this.store.openCount;

  /**
   * Desglose por estado, con su porcentaje.
   *
   * Es lo que justifica que este panel sea más que los tres contadores del
   * listado: da la distribución completa.
   */
  protected readonly breakdown = computed(() => {
    const incidents = this.store.incidents();
    const total = incidents.length;

    return (Object.keys(STATUS_LABELS) as IncidentStatus[]).map((status) => {
      const count = incidents.filter((incident) => incident.status === status).length;

      return {
        status,
        label: STATUS_LABELS[status],
        count,
        // Sin incidencias no hay porcentaje: cero evita dividir por cero.
        percent: total === 0 ? 0 : Math.round((count / total) * 100),
      };
    });
  });
}
