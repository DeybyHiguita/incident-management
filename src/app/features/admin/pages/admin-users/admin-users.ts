import { Component, computed, inject } from '@angular/core';
import { UserService } from '../../../../core/services/user-service';
import { AuthService } from '../../../../core/services/auth-service';

@Component({
  selector: 'app-admin-users',
  imports: [],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
})
export class AdminUsers {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  protected readonly users = this.userService.getAll();

  /** Identificador de quien está viendo la página, para señalarlo. */
  protected readonly currentUserId = computed(() => this.authService.currentUser()?.id ?? null);
}
