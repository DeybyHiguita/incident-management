import { Component, Input, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth-service';
import { FocusWithin } from '../../shared/directives/focus-within';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, FocusWithin],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  @Input() systemTitle = '';

  /** Usuario de la sesión, o `null` si no hay nadie dentro. */
  protected readonly currentUser = this.authService.currentUser;
  protected readonly isAuthenticated = this.authService.isAuthenticated;

  protected readonly showUserDetails = signal(true);

  toggleUserDetails(): void {
    this.showUserDetails.update((visible) => !visible);
  }

  protected logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
