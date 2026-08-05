import { Directive, ElementRef, inject, signal } from '@angular/core';

/**
 * Marca el elemento mientras el foco esté en él o en cualquiera de sus
 * descendientes, para poder resaltarlo desde CSS.
 *
 * Funciona con teclado por construcción: `focusin`/`focusout` son los
 * eventos que dispara el navegador al tabular, sin depender del ratón.
 *
 * Usa **host listeners** para escuchar y un **host binding** para aplicar la
 * clase. El DOM solo se lee (`contains`), nunca se escribe: quien pone y
 * quita la clase es Angular.
 *
 * @example
 * <article appFocusWithin>…</article>
 */
@Directive({
  selector: '[appFocusWithin]',
  host: {
    '[class.has-focus-within]': 'hasFocusWithin()',
    // Host listeners. Se usan focusin/focusout —y no focus/blur— porque
    // estos sí se propagan desde los descendientes hasta el host.
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class FocusWithin {
  /**
   * Inyección de dependencias: Angular entrega la referencia al elemento
   * anfitrión. Se necesita para saber si el foco salió de verdad del
   * componente o solo se movió entre sus hijos.
   */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly focusWithin = signal(false);

  /** `true` mientras el foco esté dentro del elemento. */
  readonly hasFocusWithin = this.focusWithin.asReadonly();

  protected onFocusIn(): void {
    this.focusWithin.set(true);
  }

  protected onFocusOut(event: FocusEvent): void {
    const nextTarget = event.relatedTarget;

    // Al tabular entre dos botones de la misma tarjeta, `focusout` salta
    // aunque el foco siga dentro. Sin esta comprobación, la marca
    // parpadearía en cada salto.
    const stillInside =
      nextTarget instanceof Node && this.host.nativeElement.contains(nextTarget);

    this.focusWithin.set(stillInside);
  }
}
