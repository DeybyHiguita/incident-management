import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmDialog } from './confirm-dialog';

@Component({
  imports: [ConfirmDialog],
  template: `
    <app-confirm-dialog
      [open]="open()"
      title="Eliminar incidencia"
      message="Esta acción no se puede deshacer."
      confirmLabel="Eliminar"
      [destructive]="true"
      (confirmed)="confirmedTimes = confirmedTimes + 1"
      (cancelled)="cancelledTimes = cancelledTimes + 1"
    />
  `,
})
class HostComponent {
  readonly open = signal(true);
  confirmedTimes = 0;
  cancelledTimes = 0;
}

describe('ConfirmDialog', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Un <dialog> abierto con showModal() entra en la «capa superior» del
  // navegador y atrapa el foco de toda la página. Destruir el fixture no
  // basta: hay que cerrarlo, o los tests siguientes no pueden pulsar nada y
  // el navegador acaba desconectándose del runner.
  afterEach(() => {
    for (const element of Array.from(document.querySelectorAll('dialog'))) {
      (element as HTMLDialogElement).close();
    }
    fixture.destroy();
  });

  it('should create', () => {
    expect(fixture.nativeElement.querySelector('app-confirm-dialog')).toBeTruthy();
  });

  it('se apoya en el modal en vez de repetir su lógica', () => {
    expect(fixture.nativeElement.querySelector('dialog')).toBeTruthy();
  });

  it('muestra el título y el mensaje que le pasan', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Eliminar incidencia');
    expect(text).toContain('Esta acción no se puede deshacer.');
  });

  it('avisa al confirmar', () => {
    button('Eliminar').click();

    expect(host.confirmedTimes).toBe(1);
    expect(host.cancelledTimes).toBe(0);
  });

  it('avisa al cancelar', () => {
    button('Cancelar').click();

    expect(host.cancelledTimes).toBe(1);
    expect(host.confirmedTimes).toBe(0);
  });

  it('cerrar el diálogo cuenta como cancelar', async () => {
    // Escape o clic fuera: no hacer nada es lo seguro ante una acción
    // destructiva. Se espera al propio evento `close` y no a un
    // temporizador: el navegador lo encola por su cuenta y el orden entre
    // ambos no está garantizado.
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    const closed = new Promise<void>((resolve) =>
      dialog.addEventListener('close', () => resolve(), { once: true }),
    );

    dialog.close();
    await closed;
    fixture.detectChanges();

    expect(host.cancelledTimes).toBe(1);
    expect(host.confirmedTimes).toBe(0);
  });

  it('marca la confirmación como destructiva', () => {
    expect(button('Eliminar').classList).toContain('btn--danger');
  });

  function button(label: string): HTMLButtonElement {
    return Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    )!;
  }
});
