import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Estado vacío reutilizable.
 *
 * Antes cada pantalla escribía su propio «no hay nada»: mismo borde
 * discontinuo, mismo color, mismo centrado, repetido. Ahora se dice **qué**
 * poner y el componente decide cómo se ve.
 *
 * El texto principal llega por input, y la ranura de proyección permite
 * añadir una acción («Registrar la primera») sin que el componente tenga
 * que conocerla.
 */
@Component({
  selector: 'app-empty-state',
  imports: [],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly message = input.required<string>();

  /** Aclaración opcional bajo el mensaje. */
  readonly hint = input('');
}
