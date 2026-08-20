import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IncidentStore } from '../../../../core/state/incident-store';
import { UserService } from '../../../../core/services/user-service';
import { AuthService } from '../../../../core/services/auth-service';
import { IncidentPriorityPipe } from '../../../../shared/pipes/incident-priority-pipe';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time-pipe';
import { IncidentHighlight } from '../../../../shared/directives/incident-highlight';

@Component({
  selector: 'app-incident-detail',
  imports: [
    RouterLink,
    DatePipe,
    UpperCasePipe,
    IncidentPriorityPipe,
    RelativeTimePipe,
    IncidentHighlight,
  ],
  templateUrl: './incident-detail.html',
  styleUrl: './incident-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentDetail {
  private readonly store = inject(IncidentStore);
  private readonly userService = inject(UserService);

  /** El guard de la ruta de edición ya lo impide; esto solo evita ofrecerlo. */
  protected readonly canManageIncidents = inject(AuthService).canManageIncidents;

  /**
   * Parámetro `:id` de la ruta. Llega como input gracias a
   * `withComponentInputBinding()`: no hace falta inyectar `ActivatedRoute`
   * ni suscribirse a nada.
   */
  readonly id = input.required<string>();

  /** `undefined` si el id no corresponde a ninguna incidencia. */
  protected readonly incident = computed(() => this.store.getById(this.id()));

  /** Nombre de quien la reportó, resuelto contra el servicio de usuarios. */
  protected readonly reporterName = computed(() => {
    const reporterId = this.incident()?.reporterId;
    return reporterId ? (this.userService.getById(reporterId)?.name ?? reporterId) : '';
  });

  protected readonly agentName = computed(() => {
    const agentId = this.incident()?.assignedAgentId;
    return agentId ? (this.userService.getById(agentId)?.name ?? agentId) : '';
  });
}
