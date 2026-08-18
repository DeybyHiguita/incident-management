import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * Ventana modal reutilizable.
 *
 * Se apoya en el elemento nativo `<dialog>` en lugar de recrearlo con
 * `<div>`. Lo que se obtiene gratis y habría que programar a mano:
 *
 * - el foco queda **atrapado** dentro mientras está abierta;
 * - `Escape` la cierra;
 * - el fondo queda inerte, sin poder tabular hacia él;
 * - el navegador restaura el foco al elemento que la abrió.
 *
 * El componente no decide cuándo abrirse: lo dice el input `open` y avisa
 * con `closed`. Así el estado sigue viviendo donde corresponde, igual que
 * con la tarjeta del Día 5.
 */
@Component({
  selector: 'app-modal',
  imports: [],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal {
  /** Si está abierta. Lo controla quien la usa. */
  readonly open = input(false);

  /** Texto accesible del botón de cerrar. */
  readonly closeLabel = input('Cerrar');

  /** Se emite al cerrar, sea por el botón, por Escape o por el fondo. */
  readonly closed = output<void>();

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    // Sincroniza la señal con el elemento del DOM, que tiene su propio
    // estado abierto/cerrado. Es el caso legítimo de `effect` del Día 10:
    // integrarse con algo que no entiende señales.
    effect(() => {
      const dialog = this.dialogRef().nativeElement;

      if (this.open() && !dialog.open) {
        dialog.showModal();
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }

  /** El `<dialog>` avisa al cerrarse, incluida la tecla Escape. */
  protected onDialogClose(): void {
    this.closed.emit();
  }

  protected close(): void {
    this.dialogRef().nativeElement.close();
  }

  /**
   * Cierra al pulsar fuera del panel.
   *
   * El `<dialog>` ocupa toda la pantalla y su `::backdrop` no recibe
   * eventos, así que se comprueba si el clic cayó en el propio diálogo y
   * no en el panel interior.
   */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialogRef().nativeElement) {
      this.close();
    }
  }
}
