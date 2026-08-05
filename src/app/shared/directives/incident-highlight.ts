import { Directive, computed, input } from '@angular/core';
import { IncidentPriority } from '../../core/models/incident.model';

/**
 * Resalta visualmente el elemento cuando la incidencia es crítica.
 *
 * Es una **directiva de atributo**: no tiene plantilla propia, solo añade
 * comportamiento al elemento que ya existe. No sabe nada de tarjetas, ni de
 * listados, ni de ningún componente: recibe una prioridad y expone el
 * resultado como clase y como atributo de datos.
 *
 * Toda la manipulación se hace con **host bindings**, es decir, de forma
 * declarativa: Angular sincroniza la clase y el atributo con el estado.
 * En ningún momento se toca `nativeElement`.
 *
 * @example
 * <article [appIncidentHighlight]="incident.priority">…</article>
 */
@Directive({
  selector: '[appIncidentHighlight]',
  host: {
    // Host bindings: la clase se pone y se quita sola según la señal.
    '[class.is-critical]': 'isCritical()',
    '[attr.data-priority]': 'priority()',
    // Solo las críticas se anuncian; el resto no debe interrumpir al usuario.
    '[attr.aria-current]': 'isCritical() ? "true" : null',
  },
})
export class IncidentHighlight {
  /**
   * Prioridad a evaluar. El input se llama igual que el selector para poder
   * escribir `[appIncidentHighlight]="incident.priority"` en vez de repetir
   * el atributo dos veces.
   */
  readonly priority = input.required<IncidentPriority | string | null | undefined>({
    alias: 'appIncidentHighlight',
  });

  protected readonly isCritical = computed(() => this.priority() === 'CRITICAL');
}
