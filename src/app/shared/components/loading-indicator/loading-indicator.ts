import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Indicador de carga.
 *
 * El mismo bloque —girador, texto y `role="status"`— estaba copiado en tres
 * pantallas. Aquí queda uno solo, y con él la garantía de que las tres se
 * anuncian igual a un lector de pantalla.
 *
 * `role="status"` y no `alert`: informa sin interrumpir lo que el usuario
 * esté haciendo.
 */
@Component({
  selector: 'app-loading-indicator',
  imports: [],
  templateUrl: './loading-indicator.html',
  styleUrl: './loading-indicator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingIndicator {
  readonly message = input('Cargando…');
}
