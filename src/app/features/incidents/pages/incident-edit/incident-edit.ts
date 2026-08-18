import { Component, DestroyRef, computed, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { IncidentStore } from '../../../../core/state/incident-store';
import { IncidentForm, IncidentFormValue } from '../../components/incident-form/incident-form';
import { LoadingIndicator } from '../../../../shared/components/loading-indicator/loading-indicator';

@Component({
  selector: 'app-incident-edit',
  imports: [IncidentForm, RouterLink, LoadingIndicator],
  templateUrl: './incident-edit.html',
  styleUrl: './incident-edit.scss',
})
export class IncidentEdit {
  private readonly store = inject(IncidentStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Parámetro `:id` de la ruta hija, recibido como input. */
  readonly id = input.required<string>();

  protected readonly incident = computed(() => this.store.getById(this.id()));

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

  protected readonly loading = this.store.loading;
  protected readonly error = this.store.error;

  protected onSubmitted(value: IncidentFormValue): void {
    this.store
      .update(this.id(), value)
      // Igual que en el alta: sin esto se navegaría desde un componente ya
      // destruido si el usuario se marcha mientras se guarda.
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate(['/incidents', this.id()]),
        error: () => undefined,
      });
  }

  /** Al descartar una edición se vuelve al detalle, no al listado. */
  protected onCancelled(): void {
    this.router.navigate(['/incidents', this.id()]);
  }
}
