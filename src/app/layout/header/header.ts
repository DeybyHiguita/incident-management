import { ChangeDetectionStrategy, Component, Input, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth-service';
import { FocusWithin } from '../../shared/directives/focus-within';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, FocusWithin],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  @Input() systemTitle = '';

  /** Usuario de la sesión, o `null` si no hay nadie dentro. */
  protected readonly currentUser = this.authService.currentUser;
  protected readonly isAuthenticated = this.authService.isAuthenticated;

  /**
   * Ocultar lo que no se puede usar evita el «clic a la nada»: el guard lo
   * rebotaría igualmente, pero enseñar una puerta cerrada es mala interfaz.
   * No sustituye al guard — es la primera de dos barreras, no la única.
   */
  protected readonly canManageIncidents = this.authService.canManageIncidents;
  protected readonly canAdminister = this.authService.canAdminister;

  protected readonly showUserDetails = signal(true);

  toggleUserDetails(): void {
    this.showUserDetails.update((visible) => !visible);
  }

  protected logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
