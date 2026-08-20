import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink],
  templateUrl: './forbidden.html',
  styleUrl: './forbidden.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Forbidden {
  private readonly authService = inject(AuthService);

  /** Se muestra el rol actual: explica por qué se le ha denegado el acceso. */
  protected readonly role = this.authService.role;
  protected readonly userName = this.authService.currentUser;
}
