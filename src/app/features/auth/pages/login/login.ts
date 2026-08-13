import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth-service';
import { LoadingService } from '../../../../core/services/loading-service';
import { notOnlyWhitespace } from '../../../../shared/validators/incident-validators';

interface LoginFormControls {
  email: FormControl<string>;
  password: FormControl<string>;
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** A dónde quería ir el usuario antes de que el guard lo desviara aquí. */
  private readonly returnUrl =
    inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';

  protected readonly loading = inject(LoadingService).loading;

  /** Mensaje del servidor si las credenciales no son válidas. */
  protected readonly error = signal<string | null>(null);

  protected readonly submitAttempted = signal(false);

  protected readonly form: FormGroup<LoginFormControls> = this.formBuilder.group({
    email: this.formBuilder.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, notOnlyWhitespace],
    }),
    password: this.formBuilder.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  protected onSubmit(): void {
    this.submitAttempted.set(true);
    this.error.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.authService
      .login(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // Se vuelve a donde iba, no siempre al panel.
        next: () => this.router.navigateByUrl(this.returnUrl),
        // El mensaje llega ya traducido por el interceptor del Día 18.
        error: (failure: Error) => this.error.set(failure.message),
      });
  }

  protected showError(field: keyof LoginFormControls): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitAttempted());
  }

  protected fieldError(field: keyof LoginFormControls): string {
    const errors = this.form.controls[field].errors;

    if (!errors) {
      return '';
    }

    if (errors['required'] || errors['onlyWhitespace']) {
      return 'Este campo es obligatorio.';
    }

    if (errors['email']) {
      return 'Introduce un correo válido.';
    }

    if (errors['minlength']) {
      return `Debe tener al menos ${errors['minlength'].requiredLength} caracteres.`;
    }

    return 'El valor no es válido.';
  }
}
