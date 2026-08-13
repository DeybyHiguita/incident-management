import { Injectable, computed, signal } from '@angular/core';

/**
 * Mecanismo global de carga.
 *
 * Cuenta las peticiones HTTP en vuelo de toda la aplicación. Lo alimenta
 * `loadingInterceptor`, así que **ningún servicio tiene que acordarse** de
 * marcar y desmarcar: basta con hacer la petición.
 *
 * Es un contador y no un booleano por la misma razón del Día 15: con dos
 * peticiones simultáneas, la primera en terminar apagaría el indicador
 * mientras la otra sigue.
 */
@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private readonly pending = signal(0);

  /** `true` mientras haya al menos una petición en curso. */
  readonly loading = computed(() => this.pending() > 0);

  /** Número de peticiones en vuelo. Útil para depurar. */
  readonly pendingCount = this.pending.asReadonly();

  start(): void {
    this.pending.update((count) => count + 1);
  }

  stop(): void {
    // `Math.max` protege de un desajuste: el contador nunca baja de cero.
    this.pending.update((count) => Math.max(0, count - 1));
  }
}
