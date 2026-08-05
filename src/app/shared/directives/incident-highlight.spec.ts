import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentHighlight } from './incident-highlight';
import { IncidentPriority } from '../../core/models/incident.model';

/**
 * Componente anfitrión de prueba. Una directiva no se instancia con `new`:
 * necesita vivir sobre un elemento real para que Angular resuelva sus
 * inputs y aplique sus host bindings.
 *
 * Se aplica sobre tres etiquetas distintas a propósito, para demostrar que
 * la directiva no depende de ningún componente ni elemento concreto.
 */
@Component({
  imports: [IncidentHighlight],
  template: `
    <article id="card" [appIncidentHighlight]="priority()">Tarjeta</article>
    <p id="paragraph" [appIncidentHighlight]="priority()">Párrafo</p>
    <div id="box" appIncidentHighlight="CRITICAL">Valor fijo</div>
  `,
})
class HostComponent {
  readonly priority = signal<IncidentPriority | string | null>('LOW');
}

describe('IncidentHighlight', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(element('card')).toBeTruthy();
  });

  it('resalta la incidencia crítica', () => {
    host.priority.set('CRITICAL');
    fixture.detectChanges();

    expect(element('card').classList).toContain('is-critical');
  });

  it('no resalta las prioridades que no son críticas', () => {
    for (const priority of ['LOW', 'MEDIUM', 'HIGH'] as const) {
      host.priority.set(priority);
      fixture.detectChanges();

      expect(element('card').classList)
        .withContext(`No debería resaltar la prioridad ${priority}`)
        .not.toContain('is-critical');
    }
  });

  it('quita el resaltado cuando la prioridad deja de ser crítica', () => {
    host.priority.set('CRITICAL');
    fixture.detectChanges();
    expect(element('card').classList).toContain('is-critical');

    host.priority.set('LOW');
    fixture.detectChanges();

    expect(element('card').classList).not.toContain('is-critical');
  });

  it('expone la prioridad como atributo de datos', () => {
    host.priority.set('HIGH');
    fixture.detectChanges();

    expect(element('card').getAttribute('data-priority')).toBe('HIGH');
  });

  it('solo anuncia con aria-current las incidencias críticas', () => {
    host.priority.set('HIGH');
    fixture.detectChanges();
    expect(element('card').hasAttribute('aria-current')).toBe(false);

    host.priority.set('CRITICAL');
    fixture.detectChanges();
    expect(element('card').getAttribute('aria-current')).toBe('true');
  });

  it('funciona igual sobre cualquier elemento, no solo sobre la tarjeta', () => {
    host.priority.set('CRITICAL');
    fixture.detectChanges();

    expect(element('card').classList).toContain('is-critical');
    expect(element('paragraph').classList).toContain('is-critical');
    expect(element('box').classList).toContain('is-critical');
  });

  it('tolera valores nulos o desconocidos sin resaltar', () => {
    for (const value of [null, '', 'URGENT', 'critical']) {
      host.priority.set(value);
      fixture.detectChanges();

      expect(element('card').classList)
        .withContext(`No debería resaltar el valor ${JSON.stringify(value)}`)
        .not.toContain('is-critical');
    }
  });

  function element(id: string): HTMLElement {
    return fixture.nativeElement.querySelector(`#${id}`);
  }
});
