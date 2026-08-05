import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FocusWithin } from './focus-within';

@Component({
  imports: [FocusWithin],
  template: `
    <div id="panel" appFocusWithin>
      <button id="inside-a" type="button">A</button>
      <button id="inside-b" type="button">B</button>
    </div>
    <button id="outside" type="button">Fuera</button>
  `,
})
class HostComponent {}

describe('FocusWithin', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(panel()).toBeTruthy();
  });

  it('no marca nada mientras el foco está fuera', () => {
    expect(panel().classList).not.toContain('has-focus-within');
  });

  it('marca el elemento cuando el foco entra con teclado', () => {
    // `.focus()` es exactamente lo que hace el navegador al tabular:
    // dispara un focusin real que se propaga hasta el host.
    element('inside-a').focus();
    fixture.detectChanges();

    expect(panel().classList).toContain('has-focus-within');
  });

  it('mantiene la marca al tabular entre dos hijos', () => {
    element('inside-a').focus();
    fixture.detectChanges();

    element('inside-b').focus();
    fixture.detectChanges();

    expect(panel().classList)
      .withContext('La marca no debe parpadear al moverse dentro')
      .toContain('has-focus-within');
  });

  it('quita la marca cuando el foco sale del elemento', () => {
    element('inside-a').focus();
    fixture.detectChanges();
    expect(panel().classList).toContain('has-focus-within');

    element('outside').focus();
    fixture.detectChanges();

    expect(panel().classList).not.toContain('has-focus-within');
  });

  it('quita la marca cuando el foco se pierde sin destino (relatedTarget nulo)', () => {
    element('inside-a').focus();
    fixture.detectChanges();

    panel().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    fixture.detectChanges();

    expect(panel().classList).not.toContain('has-focus-within');
  });

  function panel(): HTMLElement {
    return element('panel');
  }

  function element(id: string): HTMLElement {
    return fixture.nativeElement.querySelector(`#${id}`);
  }
});
