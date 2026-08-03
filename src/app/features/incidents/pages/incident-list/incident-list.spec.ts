import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentList } from './incident-list';
import { MOCK_INCIDENTS } from '../../../../core/mocks/incidents.mock';

describe('IncidentList', () => {
  let fixture: ComponentFixture<IncidentList>;
  let component: IncidentList;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentList],
    }).compileComponents();

    fixture = TestBed.createComponent(IncidentList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renderiza una tarjeta hija por incidencia', () => {
    expect(cards().length).toBe(MOCK_INCIDENTS.length);
  });

  it('marca la tarjeta como seleccionada cuando el hijo emite el evento', () => {
    clickIn(cards()[1], 'Seleccionar');

    expect(text()).toContain(MOCK_INCIDENTS[1].title);
    expect(cards()[1].querySelector('.incident-card--selected')).toBeTruthy();
  });

  it('elimina la incidencia del contenedor cuando el hijo lo solicita', () => {
    const removed = MOCK_INCIDENTS[0];

    clickIn(cards()[0], 'Eliminar');

    expect(cards().length).toBe(MOCK_INCIDENTS.length - 1);
    expect(text()).not.toContain(removed.title);
  });

  it('no muta la colección original al eliminar (inmutabilidad)', () => {
    const snapshot = [...MOCK_INCIDENTS];

    clickIn(cards()[0], 'Eliminar');

    expect(MOCK_INCIDENTS).toEqual(snapshot);
  });

  it('muestra el estado vacío al eliminar todas y permite restaurar', () => {
    while (cards().length > 0) {
      clickIn(cards()[0], 'Eliminar');
    }

    expect(text()).toContain('No hay incidencias registradas.');

    clickButton('Restaurar lista');

    expect(cards().length).toBe(MOCK_INCIDENTS.length);
  });

  function cards(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('app-incident-card'));
  }

  function text(): string {
    return fixture.nativeElement.textContent ?? '';
  }

  function clickIn(root: ParentNode, label: string): void {
    const buttons: HTMLButtonElement[] = Array.from(root.querySelectorAll('button'));
    const button = buttons.find((candidate) => candidate.textContent?.trim() === label);

    if (!button) {
      throw new Error(`No se encontró el botón "${label}"`);
    }

    button.click();
    fixture.detectChanges();
  }

  function clickButton(label: string): void {
    clickIn(fixture.nativeElement, label);
  }
});
