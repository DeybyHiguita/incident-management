import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

/**
 * Deja pasar solo si hay sesión iniciada.
 *
 * Cuando no la hay, redirige al inicio de sesión conservando a dónde quería
 * ir el usuario (`returnUrl`), para poder devolverlo ahí después. Nadie
 * disfruta escribiendo la dirección otra vez.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
