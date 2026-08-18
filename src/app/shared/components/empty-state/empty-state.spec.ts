import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmptyState } from './empty-state';

@Component({
  imports: [EmptyState],
  template: `
    <app-empty-state message="No hay incidencias registradas." hint="Aparecerán aquí.">
      <button type="button" id="projected-action">Registrar</button>
    </app-empty-state>
  `,
})
class HostComponent {}

describe('EmptyState', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.nativeElement.querySelector('.empty-state')).toBeTruthy();
  });

  it('muestra el mensaje y la aclaración', () => {
    expect(fixture.nativeElement.querySelector('.empty-state-message').textContent).toContain(
      'No hay incidencias registradas.',
    );
    expect(fixture.nativeElement.querySelector('.empty-state-hint').textContent).toContain(
      'Aparecerán aquí.',
    );
  });

  it('proyecta la acción opcional', () => {
    expect(fixture.nativeElement.querySelector('#projected-action')).toBeTruthy();
  });
});

@Component({
  imports: [EmptyState],
  template: `<app-empty-state message="Sin resultados." />`,
})
class MinimalHostComponent {}

describe('EmptyState sin aclaración ni acción', () => {
  it('no deja rastro de lo que no se le pasa', async () => {
    await TestBed.configureTestingModule({ imports: [MinimalHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MinimalHostComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.empty-state-hint')).toBeNull();
    expect(fixture.nativeElement.textContent.trim()).toBe('Sin resultados.');
  });
});
