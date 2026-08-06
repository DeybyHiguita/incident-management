import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { IncidentDraft, IncidentPriority } from '../../../../core/models/incident.model';

/**
 * Lo que el usuario escribe. No es un `IncidentDraft` completo: el
 * `reporterId` lo pone el contenedor a partir de la sesión, y el `id`, las
 * fechas y el estado inicial los decide el servicio. El formulario no
 * conoce ninguna de esas reglas.
 */
export type IncidentFormValue = Omit<IncidentDraft, 'reporterId' | 'status'>;

/** Forma tipada del formulario: un control por campo, todos `string`. */
interface IncidentFormControls {
  title: FormControl<string>;
  description: FormControl<string>;
  category: FormControl<string>;
  priority: FormControl<IncidentPriority | ''>;
}

@Component({
  selector: 'app-incident-form',
  imports: [ReactiveFormsModule],
  templateUrl: './incident-form.html',
  styleUrl: './incident-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentForm {
  private readonly formBuilder = inject(FormBuilder);

  /** Se emite solo cuando el formulario es válido. */
  readonly submitted = output<IncidentFormValue>();

  /**
   * `nonNullable: true` hace que los controles nunca sean `null`, ni
   * siquiera tras un `reset()`. Es lo que permite tipar el grupo como
   * `FormControl<string>` en vez de `FormControl<string | null>`.
   */
  protected readonly form: FormGroup<IncidentFormControls> = this.formBuilder.group({
    title: this.formBuilder.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5), Validators.maxLength(100)],
    }),
    description: this.formBuilder.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10)],
    }),
    category: this.formBuilder.control('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    priority: this.formBuilder.control<IncidentPriority | ''>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  /**
   * Se marca al intentar enviar. Junto con `touched`, decide cuándo se
   * muestran los errores: nunca mientras el usuario escribe por primera vez.
   */
  protected readonly submitAttempted = signal(false);

  /** Mensaje de confirmación tras un registro correcto. */
  protected readonly lastRegisteredTitle = signal<string | null>(null);

  protected onSubmit(): void {
    this.submitAttempted.set(true);
    this.lastRegisteredTitle.set(null);

    if (this.form.invalid) {
      // Marcar todo como tocado hace visibles los errores de los campos que
      // el usuario ni siquiera llegó a abrir.
      this.form.markAllAsTouched();
      return;
    }

    const { title, description, category, priority } = this.form.getRawValue();

    this.submitted.emit({
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      priority: priority as IncidentPriority,
    });

    this.lastRegisteredTitle.set(title.trim());
    this.resetForm();
  }

  protected resetForm(): void {
    this.form.reset();
    this.submitAttempted.set(false);
  }

  /** Un campo muestra su error si es inválido y el usuario ya interactuó o envió. */
  protected showError(field: keyof IncidentFormControls): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitAttempted());
  }

  /** Primer mensaje de error aplicable al campo, o cadena vacía. */
  protected errorMessage(field: keyof IncidentFormControls): string {
    const control = this.form.controls[field];

    if (!control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio.';
    }

    if (control.errors['minlength']) {
      const required = control.errors['minlength'].requiredLength;
      return `Debe tener al menos ${required} caracteres.`;
    }

    if (control.errors['maxlength']) {
      const required = control.errors['maxlength'].requiredLength;
      return `No puede superar los ${required} caracteres.`;
    }

    return 'El valor no es válido.';
  }
}
