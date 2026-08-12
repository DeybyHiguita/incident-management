import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  private readonly destroyRef = inject(DestroyRef);

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
      // Si el usuario se va de la página antes de que responda el servidor,
      // la suscripción se corta: sin esto se navegaría al detalle desde un
      // componente ya destruido, sacando al usuario de donde esté.
      .pipe(takeUntilDestroyed(this.destroyRef))
      // Solo se navega si el servidor confirmó: si la petición falla, el
      // usuario se queda en el formulario con el mensaje de error.
      .subscribe({
        next: (created) => this.router.navigate(['/incidents', created.id]),
        error: () => undefined,
      });
  }

  /** Al descartar un alta no hay nada que ver: se vuelve al listado. */
  protected onCancelled(): void {
    this.router.navigate(['/incidents']);
  }
}
