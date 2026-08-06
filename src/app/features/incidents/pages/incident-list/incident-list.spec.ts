import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentList } from './incident-list';
import { MOCK_INCIDENTS } from '../../../../core/mocks/incidents.mock';
import { IncidentService } from '../../../../core/services/incident-service';

/** Ancho de referencia del teléfono más estrecho que soportamos. */
const NARROW_VIEWPORT_PX = 320;

describe('IncidentList', () => {
  let fixture: ComponentFixture<IncidentList>;
  let component: IncidentList;
  let service: IncidentService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentList],
    }).compileComponents();

    // El servicio es un singleton: se reinicia para que cada prueba parta
    // del mismo estado conocido.
    service = TestBed.inject(IncidentService);
    service.reset();

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

    clickIn(cards()[0], 'Eliminar incidencia');

    expect(cards().length).toBe(MOCK_INCIDENTS.length - 1);
    expect(text()).not.toContain(removed.title);
  });

  it('no muta la colección original al eliminar (inmutabilidad)', () => {
    const snapshot = [...MOCK_INCIDENTS];

    clickIn(cards()[0], 'Eliminar incidencia');

    expect(MOCK_INCIDENTS).toEqual(snapshot);
  });

  it('delega la eliminación en el servicio en vez de gestionar los datos', () => {
    spyOn(service, 'remove').and.callThrough();

    clickIn(cards()[0], 'Eliminar incidencia');

    expect(service.remove).toHaveBeenCalledWith(MOCK_INCIDENTS[0].id);
  });

  it('refleja los cambios que otro consumidor haga en el servicio', () => {
    // Nadie tocó el componente: el estado vive en el servicio y la vista
    // se actualiza sola porque lee una señal.
    service.remove(MOCK_INCIDENTS[0].id);
    fixture.detectChanges();

    expect(cards().length).toBe(MOCK_INCIDENTS.length - 1);
    expect(text()).not.toContain(MOCK_INCIDENTS[0].title);
  });

  it('muestra el estado vacío al eliminar todas y permite restaurar', () => {
    while (cards().length > 0) {
      clickIn(cards()[0], 'Eliminar incidencia');
    }

    expect(text()).toContain('No hay incidencias registradas.');

    clickIn(fixture.nativeElement, 'Restaurar lista');

    expect(cards().length).toBe(MOCK_INCIDENTS.length);
  });

  // --- Día 6: accesibilidad y diseño adaptable -----------------------------

  it('agrupa las tarjetas en una lista semántica', () => {
    const items = fixture.nativeElement.querySelectorAll('ul.incident-list__grid > li');

    expect(items.length).toBe(MOCK_INCIDENTS.length);
  });

  it('todos los controles interactivos son elementos nativos con nombre accesible', () => {
    const controls = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('button, a, input, select, textarea'),
    );

    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) {
      // Elementos nativos: alcanzables con Tab sin necesidad de tabindex.
      expect(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(control.tagName);
      expect(accessibleName(control))
        .withContext(`"${control.className}" no tiene nombre accesible`)
        .toBeTruthy();
    }
  });

  it('anuncia el cambio de selección en una región aria-live', () => {
    const live: HTMLElement = fixture.nativeElement.querySelector('[aria-live="polite"]');

    expect(live.textContent).toContain('Ninguna incidencia seleccionada');

    clickIn(cards()[0], 'Seleccionar');

    expect(live.textContent).toContain(MOCK_INCIDENTS[0].title);
  });

  it(`no desborda horizontalmente a ${NARROW_VIEWPORT_PX}px de ancho`, () => {
    const host: HTMLElement = fixture.nativeElement;
    host.style.width = `${NARROW_VIEWPORT_PX}px`;
    fixture.detectChanges();

    // Tolerancia de 1px por redondeo sub-píxel del navegador.
    expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth + 1);

    for (const card of cards()) {
      expect(card.scrollWidth)
        .withContext('Una tarjeta desborda su columna')
        .toBeLessThanOrEqual(card.clientWidth + 1);
    }
  });

  it('deshabilita el botón de restaurar cuando la lista está completa', () => {
    const restore = findIn(fixture.nativeElement, 'Restaurar lista');

    expect(restore.disabled).toBe(true);

    clickIn(cards()[0], 'Eliminar incidencia');

    expect(findIn(fixture.nativeElement, 'Restaurar lista').disabled).toBe(false);
  });

  function cards(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('app-incident-card'));
  }

  function text(): string {
    return fixture.nativeElement.textContent ?? '';
  }

  function accessibleName(element: HTMLElement): string {
    return element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '';
  }

  function findIn(root: ParentNode, label: string): HTMLButtonElement {
    const buttons = Array.from<HTMLButtonElement>(root.querySelectorAll('button'));
    const button = buttons.find((candidate) => accessibleName(candidate).startsWith(label));

    if (!button) {
      throw new Error(`No se encontró el botón "${label}"`);
    }

    return button;
  }

  function clickIn(root: ParentNode, label: string): void {
    findIn(root, label).click();
    fixture.detectChanges();
  }
});
