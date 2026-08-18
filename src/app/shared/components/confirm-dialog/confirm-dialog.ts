import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Modal } from '../modal/modal';

/**
 * Confirmación de una acción.
 *
 * Se construye **sobre** `Modal` en vez de repetir su lógica: es el modal
 * con un mensaje y dos botones. Quien lo usa solo dice qué preguntar y
 * escucha la respuesta.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [Modal],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  readonly open = input(false);
  readonly title = input('¿Confirmas la acción?');
  readonly message = input('');
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');

  /** `true` si la acción es destructiva: tiñe el botón de confirmar. */
  readonly destructive = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected onConfirm(): void {
    this.confirmed.emit();
  }

  /** Cancelar y cerrar por Escape o por el fondo son lo mismo: no hacer nada. */
  protected onCancel(): void {
    this.cancelled.emit();
  }
}
