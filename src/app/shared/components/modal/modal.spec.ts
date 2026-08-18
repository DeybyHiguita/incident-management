import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Modal } from './modal';

/**
 * Anfitrión de prueba: además de abrir y cerrar, proyecta contenido en las
 * tres ranuras, que es lo que hay que comprobar de verdad.
 */
@Component({
  imports: [Modal],
  template: `
    <app-modal [open]="open()" (closed)="closedTimes = closedTimes + 1">
      <span modalTitle>Eliminar incidencia</span>
      <p id="projected-body">¿Seguro que quieres continuar?</p>
      <button modalActions type="button" id="projected-action">Aceptar</button>
    </app-modal>
  `,
})
class HostComponent {
  readonly open = signal(false);
  closedTimes = 0;
}

describe('Modal', () => {
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
    expect(dialog()).toBeTruthy();
  });

  it('arranca cerrado', () => {
    expect(dialog().open).toBe(false);
  });

  it('se abre cuando el input lo pide', () => {
    openModal();

    expect(dialog().open).toBe(true);
  });

  it('se cierra cuando el input vuelve a false', () => {
    openModal();

    host.open.set(false);
    fixture.detectChanges();

    expect(dialog().open).toBe(false);
  });

  describe('proyección de contenido', () => {
    beforeEach(() => openModal());

    it('coloca el título en su ranura', () => {
      expect(fixture.nativeElement.querySelector('.modal-title').textContent).toContain(
        'Eliminar incidencia',
      );
    });

    it('coloca el contenido sin selector en el cuerpo', () => {
      const body = fixture.nativeElement.querySelector('.modal-body');

      expect(body.querySelector('#projected-body')).toBeTruthy();
    });

    it('coloca las acciones en el pie', () => {
      const actions = fixture.nativeElement.querySelector('.modal-actions');

      expect(actions.querySelector('#projected-action')).toBeTruthy();
    });
  });

  describe('cierre', () => {
    beforeEach(() => openModal());

    // Estos dos son `async` y no `fakeAsync`: el navegador encola el evento
    // `close` del <dialog> por su cuenta, fuera de Zone.js, así que `tick()`
    // no puede adelantarlo. Hay que esperar de verdad.
    it('el botón de cerrar lo cierra y avisa', async () => {
      const closed = whenClosed();
      closeButton().click();
      await closed;
      fixture.detectChanges();

      expect(dialog().open).toBe(false);
      expect(host.closedTimes).toBe(1);
    });

    it('avisa también cuando lo cierra el navegador (Escape)', async () => {
      // `Escape` sobre un <dialog> abierto dispara su evento `close`.
      const closed = whenClosed();
      dialog().close();
      await closed;
      fixture.detectChanges();

      expect(host.closedTimes).toBe(1);
    });

    it('el botón de cerrar tiene nombre accesible', () => {
      expect(closeButton().getAttribute('aria-label')).toBe('Cerrar');
    });
  });

  it('usa el elemento nativo <dialog>, que aporta el foco atrapado', () => {
    // Si algún día se reemplazara por un <div>, habría que programar a mano
    // la trampa de foco, el Escape y la inercia del fondo.
    expect(dialog().tagName).toBe('DIALOG');
  });

  /**
   * Promesa que se resuelve con el evento `close` del propio diálogo.
   *
   * Se espera **al evento**, no a un temporizador: el navegador lo encola
   * por su cuenta y el orden respecto a un `setTimeout(0)` no está
   * garantizado. Con un temporizador, el test pasaba o fallaba según cuál
   * de las dos tareas se ejecutara antes.
   *
   * Debe llamarse **antes** de cerrar, para no perderse el evento.
   */
  function whenClosed(): Promise<void> {
    return new Promise((resolve) =>
      dialog().addEventListener('close', () => resolve(), { once: true }),
    );
  }

  function openModal(): void {
    host.open.set(true);
    fixture.detectChanges();
  }

  function dialog(): HTMLDialogElement {
    return fixture.nativeElement.querySelector('dialog');
  }

  function closeButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.modal-close');
  }
});
