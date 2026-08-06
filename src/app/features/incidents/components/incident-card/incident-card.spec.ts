import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentCard } from './incident-card';
import { Incident } from '../../../../core/models/incident.model';

const INCIDENT: Incident = {
  id: 'inc-001',
  title: 'No se puede iniciar sesión',
  description: 'El usuario recibe un error 500 al intentar autenticarse.',
  category: 'Autenticación',
  priority: 'HIGH',
  status: 'OPEN',
  reporterId: 'u-004',
  createdAt: '2026-07-27T09:15:00.000Z',
  updatedAt: '2026-07-27T09:15:00.000Z',
};

describe('IncidentCard', () => {
  let component: IncidentCard;
  let fixture: ComponentFixture<IncidentCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentCard],
    }).compileComponents();

    fixture = TestBed.createComponent(IncidentCard);
    component = fixture.componentInstance;
    // El input es requerido: hay que asignarlo antes del primer ciclo de detección.
    fixture.componentRef.setInput('incident', INCIDENT);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emite la incidencia recibida al seleccionar', () => {
    let emitted: Incident | undefined;
    component.incidentSelected.subscribe((incident) => (emitted = incident));

    clickButton('Seleccionar');

    expect(emitted).toBe(INCIDENT);
  });

  it('emite la incidencia recibida al pedir eliminarla, sin modificarla', () => {
    let emitted: Incident | undefined;
    component.deleteRequested.subscribe((incident) => (emitted = incident));

    clickButton('Eliminar incidencia');

    expect(emitted).toBe(INCIDENT);
    expect(component.incident()).toEqual(INCIDENT);
  });

  it('todos los botones tienen un nombre accesible', () => {
    const buttons = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('button'),
    );

    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(accessibleName(button))
        .withContext(`El botón "${button.className}" no tiene nombre accesible`)
        .toBeTruthy();
    }
  });

  it('el botón que solo tiene icono se identifica con aria-label y oculta el svg', () => {
    const iconButton: HTMLButtonElement = fixture.nativeElement.querySelector('.btn--icon');

    expect(iconButton.textContent?.trim()).toBe('');
    expect(iconButton.getAttribute('aria-label')).toBe(`Eliminar incidencia: ${INCIDENT.title}`);
    expect(iconButton.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('refleja el estado de selección con aria-pressed', () => {
    const selectButton = findButton('Seleccionar');
    expect(selectButton.getAttribute('aria-pressed')).toBe('false');

    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();

    expect(findButton('Seleccionada').getAttribute('aria-pressed')).toBe('true');
  });

  it('expone la fecha de creación en un elemento <time> legible por máquinas', () => {
    const time: HTMLTimeElement = fixture.nativeElement.querySelector('time');

    // Valor exacto para las máquinas...
    expect(time.getAttribute('datetime')).toBe(INCIDENT.createdAt);
    // ...fecha completa en el tooltip...
    expect(time.getAttribute('title')).toContain('2026');
    // ...y lectura rápida en el texto visible (relativa, no una fecha fija:
    // el test no se rompe con el paso del tiempo).
    expect(time.textContent?.trim()).toMatch(/^Creada /);
  });

  describe('resaltado de incidencias críticas', () => {
    it('no resalta una incidencia que no es crítica', () => {
      const card: HTMLElement = fixture.nativeElement.querySelector('.incident-card');

      expect(card.classList).not.toContain('is-critical');
      expect(getComputedStyle(card).borderLeftWidth).toBe('1px');
    });

    it('aplica el resaltado visible, no solo la clase', () => {
      // Comprobar únicamente la clase no basta: la encapsulación de estilos
      // puede hacer que el CSS del componente gane a la clase global y el
      // resaltado no llegue a verse.
      fixture.componentRef.setInput('incident', { ...INCIDENT, priority: 'CRITICAL' });
      fixture.detectChanges();

      const card: HTMLElement = fixture.nativeElement.querySelector('.incident-card');
      const styles = getComputedStyle(card);

      expect(card.classList).toContain('is-critical');
      expect(styles.borderLeftWidth).toBe('4px');
      expect(styles.borderLeftColor).toBe('rgb(185, 28, 28)');
    });
  });

  function accessibleName(element: HTMLElement): string {
    return element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '';
  }

  function findButton(label: string): HTMLButtonElement {
    const buttons = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('button'),
    );
    const button = buttons.find((candidate) => accessibleName(candidate).startsWith(label));

    if (!button) {
      throw new Error(`No se encontró el botón "${label}"`);
    }

    return button;
  }

  function clickButton(label: string): void {
    findButton(label).click();
    fixture.detectChanges();
  }
});
