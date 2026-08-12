import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { IncidentDraft, IncidentPriority } from '../../../../core/models/incident.model';
import {
  forbiddenWords,
  maxItems,
  noDuplicates,
  notOnlyWhitespace,
} from '../../../../shared/validators/incident-validators';

/**
 * Lo que el usuario escribe. No es un `IncidentDraft` completo: el
 * `reporterId` lo pone el contenedor a partir de la sesión, y el `id`, las
 * fechas y el estado inicial los decide el servicio. El formulario no
 * conoce ninguna de esas reglas.
 */
export type IncidentFormValue = Omit<IncidentDraft, 'reporterId' | 'status'>;

/** Forma tipada del formulario. */
interface IncidentFormControls {
  title: FormControl<string>;
  description: FormControl<string>;
  category: FormControl<string>;
  priority: FormControl<IncidentPriority | ''>;
  tags: FormArray<FormControl<string>>;
}

/** Palabras que delatan una incidencia de prueba y no deben llegar al registro. */
export const FORBIDDEN_TITLE_WORDS = ['test', 'prueba', 'pruebas', 'asdf', 'xxx'] as const;

/** Tope de etiquetas por incidencia. */
export const MAX_TAGS = 5;

@Component({
  selector: 'app-incident-form',
  imports: [ReactiveFormsModule],
  templateUrl: './incident-form.html',
  styleUrl: './incident-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentForm {
  private readonly formBuilder = inject(FormBuilder);

  protected readonly maxTags = MAX_TAGS;

  /**
   * Valores de partida. Con `null` (por defecto) el formulario es de alta;
   * con datos, de edición. Es el único cambio que necesita el componente
   * para servir a las dos pantallas.
   */
  readonly initialValue = input<IncidentFormValue | null>(null);

  /** Texto del botón de envío, para que cada pantalla nombre su acción. */
  readonly submitLabel = input('Registrar incidencia');

  /** Se emite solo cuando el formulario es válido. */
  readonly submitted = output<IncidentFormValue>();

  /**
   * El usuario descarta la operación. El formulario no navega: avisa, y cada
   * pantalla decide a dónde volver, igual que con `submitted`.
   */
  readonly cancelled = output<void>();

  protected readonly form: FormGroup<IncidentFormControls> = this.formBuilder.group({
    title: this.formBuilder.control('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(100),
        notOnlyWhitespace,
        forbiddenWords(FORBIDDEN_TITLE_WORDS),
      ],
    }),
    description: this.formBuilder.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10), notOnlyWhitespace],
    }),
    category: this.formBuilder.control('', {
      nonNullable: true,
      validators: [Validators.required, notOnlyWhitespace],
    }),
    priority: this.formBuilder.control<IncidentPriority | ''>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    // Colección dinámica: empieza vacía y crece con el botón "Añadir".
    // Los validadores de aquí son del conjunto, no de cada etiqueta.
    tags: this.formBuilder.array<FormControl<string>>([], {
      validators: [maxItems(MAX_TAGS), noDuplicates],
    }),
  });

  protected readonly submitAttempted = signal(false);
  protected readonly lastRegisteredTitle = signal<string | null>(null);

  constructor() {
    // Cuando llega un valor inicial, se vuelca en el formulario. Va en un
    // effect porque el input puede resolverse después de crear el
    // componente (por ejemplo, al cargar la incidencia a editar).
    effect(() => {
      const value = this.initialValue();

      if (value) {
        this.applyValue(value);
      }
    });
  }

  /** Rellena el formulario con unos valores dados, incluidas las etiquetas. */
  private applyValue(value: IncidentFormValue): void {
    this.form.patchValue({
      title: value.title,
      description: value.description,
      category: value.category,
      priority: value.priority,
    });

    this.tags.clear();
    for (const tag of value.tags ?? []) {
      this.addTag();
      this.tags.at(this.tags.length - 1).setValue(tag);
    }
  }

  protected get tags(): FormArray<FormControl<string>> {
    return this.form.controls.tags;
  }

  // --- Etiquetas -----------------------------------------------------------

  protected addTag(): void {
    if (this.tags.length >= MAX_TAGS) {
      return;
    }

    this.tags.push(
      this.formBuilder.control('', {
        nonNullable: true,
        validators: [Validators.required, notOnlyWhitespace, Validators.maxLength(20)],
      }),
    );
  }

  protected removeTag(index: number): void {
    this.tags.removeAt(index);
  }

  protected showTagsError(): boolean {
    return this.tags.invalid && (this.tags.touched || this.submitAttempted());
  }

  protected tagsErrorMessage(): string {
    const errors = this.tags.errors;

    if (errors?.['maxItems']) {
      return `No se pueden añadir más de ${errors['maxItems'].max} etiquetas.`;
    }

    if (errors?.['duplicates']) {
      return `Hay etiquetas repetidas: ${errors['duplicates'].values.join(', ')}.`;
    }

    return '';
  }

  // --- Envío ---------------------------------------------------------------

  protected onSubmit(): void {
    this.submitAttempted.set(true);
    this.lastRegisteredTitle.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { title, description, category, priority, tags } = this.form.getRawValue();

    this.submitted.emit({
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      priority: priority as IncidentPriority,
      tags: tags.map((tag) => tag.trim()),
    });

    // Al editar, la pantalla navega fuera tras guardar: ni se limpia el
    // formulario ni se anuncia un registro que no ha ocurrido.
    if (!this.initialValue()) {
      this.lastRegisteredTitle.set(title.trim());
      this.resetForm();
    }
  }

  /**
   * Devuelve el formulario a su punto de partida.
   *
   * Al dar de alta eso es vaciarlo; al editar, volver a los valores
   * originales de la incidencia — vaciar el formulario de edición borraría
   * los datos que el usuario está corrigiendo.
   */
  protected resetForm(): void {
    this.form.reset();
    // `reset()` no vacía un FormArray: hay que quitar los controles a mano.
    this.tags.clear();
    this.submitAttempted.set(false);

    const initial = this.initialValue();
    if (initial) {
      this.applyValue(initial);
    }
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }

  // --- Errores de campo ----------------------------------------------------

  protected showError(field: 'title' | 'description' | 'category' | 'priority'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitAttempted());
  }

  protected showTagError(index: number): boolean {
    const control = this.tags.at(index);
    return control.invalid && (control.touched || this.submitAttempted());
  }

  protected errorMessage(control: { errors: Record<string, unknown> | null }): string {
    const errors = control.errors;

    if (!errors) {
      return '';
    }

    if (errors['required']) {
      return 'Este campo es obligatorio.';
    }

    if (errors['onlyWhitespace']) {
      return 'No puede contener solo espacios.';
    }

    if (errors['forbiddenWords']) {
      const found = (errors['forbiddenWords'] as { found: string[] }).found;
      return `No se permiten estas palabras: ${found.join(', ')}.`;
    }

    if (errors['minlength']) {
      return `Debe tener al menos ${(errors['minlength'] as { requiredLength: number }).requiredLength} caracteres.`;
    }

    if (errors['maxlength']) {
      return `No puede superar los ${(errors['maxlength'] as { requiredLength: number }).requiredLength} caracteres.`;
    }

    return 'El valor no es válido.';
  }

  protected fieldError(field: 'title' | 'description' | 'category' | 'priority'): string {
    return this.errorMessage(this.form.controls[field]);
  }

  protected tagError(index: number): string {
    return this.errorMessage(this.tags.at(index));
  }
}
