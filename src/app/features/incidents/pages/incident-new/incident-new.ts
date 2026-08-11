import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IncidentService } from '../../../../core/services/incident-service';
import { UserService } from '../../../../core/services/user-service';
import { IncidentForm, IncidentFormValue } from '../../components/incident-form/incident-form';

@Component({
  selector: 'app-incident-new',
  imports: [IncidentForm, RouterLink],
  templateUrl: './incident-new.html',
  styleUrl: './incident-new.scss',
})
export class IncidentNew {
  private readonly incidentService = inject(IncidentService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  /**
   * Registra la incidencia y lleva al usuario a su detalle.
   *
   * Es navegación **programática**: no la dispara un enlace, sino el
   * resultado de una acción. Se usa el id que devuelve el servicio, así que
   * la página no tiene que adivinar a dónde va.
   */
  protected readonly loading = this.incidentService.loading;
  protected readonly error = this.incidentService.error;

  protected onSubmitted(value: IncidentFormValue): void {
    this.incidentService
      .create({ ...value, reporterId: this.userService.currentUser().id })
      // Solo se navega si el servidor confirmó: si la petición falla, el
      // usuario se queda en el formulario con el mensaje de error.
      .subscribe({
        next: (created) => this.router.navigate(['/incidents', created.id]),
        error: () => undefined,
      });
  }
}
