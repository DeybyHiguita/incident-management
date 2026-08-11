import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IncidentService } from '../../../../core/services/incident-service';
import { IncidentForm, IncidentFormValue } from '../../components/incident-form/incident-form';

@Component({
  selector: 'app-incident-edit',
  imports: [IncidentForm, RouterLink],
  templateUrl: './incident-edit.html',
  styleUrl: './incident-edit.scss',
})
export class IncidentEdit {
  private readonly incidentService = inject(IncidentService);
  private readonly router = inject(Router);

  /** Parámetro `:id` de la ruta hija, recibido como input. */
  readonly id = input.required<string>();

  protected readonly incident = computed(() => this.incidentService.getById(this.id()));

  /** Datos con los que arranca el formulario, en el formato que él espera. */
  protected readonly initialValue = computed<IncidentFormValue | null>(() => {
    const incident = this.incident();

    if (!incident) {
      return null;
    }

    return {
      title: incident.title,
      description: incident.description,
      category: incident.category,
      priority: incident.priority,
      tags: incident.tags ?? [],
    };
  });

  protected readonly loading = this.incidentService.loading;
  protected readonly error = this.incidentService.error;

  protected onSubmitted(value: IncidentFormValue): void {
    this.incidentService.update(this.id(), value).subscribe({
      next: () => this.router.navigate(['/incidents', this.id()]),
      error: () => undefined,
    });
  }
}
