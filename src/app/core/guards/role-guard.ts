import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { UserRole } from '../models/user.model';

/**
 * Exige uno de los roles indicados para entrar.
 *
 * Es una **factoría** de guards, igual que `forbiddenWords` lo era de
 * validadores en el Día 12: recibe la configuración y devuelve la función.
 * Así la ruta se lee sola:
 *
 * ```ts
 * canActivate: [authGuard, roleGuard('ADMIN')]
 * ```
 *
 * Se distinguen dos negativas, porque no son lo mismo:
 *
 * - **Sin sesión** → al inicio de sesión. El usuario puede resolverlo
 *   entrando.
 * - **Con sesión pero sin permiso** → a la página de acceso denegado.
 *   Mandarlo al login sería engañoso: volver a entrar con la misma cuenta
 *   no le va a dar acceso.
 */
export function roleGuard(...roles: readonly UserRole[]): CanActivateFn {
  return (_route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    if (authService.hasAnyRole(...roles)) {
      return true;
    }

    return router.createUrlTree(['/forbidden']);
  };
}
