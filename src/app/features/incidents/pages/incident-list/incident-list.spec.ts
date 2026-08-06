import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentList } from './incident-list';
import { MOCK_INCIDENTS } from '../../../../core/mocks/incidents.mock';
import { IncidentService } from '../../../../core/services/incident-service';
import { UserService } from '../../../../core/services/user-service';

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
    const live: HTMLElement = fixture.nativeElement.querySelector(
      '.incident-list__selection[aria-live="polite"]',
    );

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

  // --- Día 10: signals, valores derivados y actualización reactiva ---------

  describe('indicadores derivados', () => {
    it('muestra el total, las críticas y las abiertas', () => {
      expect(stat('Totales')).toBe(String(MOCK_INCIDENTS.length));
      expect(stat('Críticas')).toBe(
        String(MOCK_INCIDENTS.filter((i) => i.priority === 'CRITICAL').length),
      );
      expect(stat('Abiertas')).toBe(
        String(MOCK_INCIDENTS.filter((i) => i.status === 'OPEN').length),
      );
    });

    it('se actualizan solos al eliminar, sin tocar el componente', () => {
      const critical = MOCK_INCIDENTS.find((i) => i.priority === 'CRITICAL')!;
      const criticalBefore = Number(stat('Críticas'));

      service.remove(critical.id);
      fixture.detectChanges();

      expect(stat('Totales')).toBe(String(MOCK_INCIDENTS.length - 1));
      expect(stat('Críticas')).toBe(String(criticalBefore - 1));
    });
  });

  describe('búsqueda y filtros', () => {
    it('filtra por término de búsqueda', () => {
      type_('#search-term', 'impresora');

      expect(cards().length).toBe(1);
      expect(text()).toContain('Impresora de red desconectada');
    });

    it('el término de búsqueda no distingue mayúsculas', () => {
      type_('#search-term', 'IMPRESORA');

      expect(cards().length).toBe(1);
    });

    it('filtra por estado', () => {
      select('#status-filter', 'IN_PROGRESS');

      const expected = MOCK_INCIDENTS.filter((i) => i.status === 'IN_PROGRESS').length;
      expect(cards().length).toBe(expected);
    });

    it('filtra por prioridad', () => {
      select('#priority-filter', 'CRITICAL');

      expect(cards().length).toBe(
        MOCK_INCIDENTS.filter((i) => i.priority === 'CRITICAL').length,
      );
    });

    it('combina los tres filtros a la vez', () => {
      select('#status-filter', 'IN_PROGRESS');
      select('#priority-filter', 'CRITICAL');

      expect(cards().length).toBe(
        MOCK_INCIDENTS.filter((i) => i.status === 'IN_PROGRESS' && i.priority === 'CRITICAL')
          .length,
      );
    });

    it('actualiza el contador de resultados sin cambiar el total', () => {
      select('#priority-filter', 'CRITICAL');

      const critical = MOCK_INCIDENTS.filter((i) => i.priority === 'CRITICAL').length;
      expect(counter()).toContain(`Mostrando ${critical} de ${MOCK_INCIDENTS.length}`);
      // Los indicadores cuentan sobre toda la colección, no sobre lo filtrado.
      expect(stat('Totales')).toBe(String(MOCK_INCIDENTS.length));
    });

    it('muestra un mensaje propio cuando ningún resultado coincide', () => {
      type_('#search-term', 'texto que no aparece en ninguna parte');

      expect(cards().length).toBe(0);
      expect(text()).toContain('Ninguna incidencia coincide con los filtros aplicados');
      expect(text()).not.toContain('No hay incidencias registradas.');
    });

    it('limpia todos los filtros de una vez', () => {
      type_('#search-term', 'impresora');
      select('#priority-filter', 'LOW');
      expect(cards().length).toBe(1);

      clickIn(fixture.nativeElement, 'Limpiar filtros');

      expect(cards().length).toBe(MOCK_INCIDENTS.length);
      expect(input('#search-term').value).toBe('');
    });

    it('deshabilita el botón de limpiar cuando no hay filtros activos', () => {
      expect(findIn(fixture.nativeElement, 'Limpiar filtros').disabled).toBe(true);

      type_('#search-term', 'a');

      expect(findIn(fixture.nativeElement, 'Limpiar filtros').disabled).toBe(false);
    });

    it('el filtro sigue aplicándose cuando cambian los datos del servicio', () => {
      select('#priority-filter', 'MEDIUM');
      const before = cards().length;

      const medium = MOCK_INCIDENTS.find((i) => i.priority === 'MEDIUM')!;
      service.remove(medium.id);
      fixture.detectChanges();

      expect(cards().length).toBe(before - 1);
    });
  });

  describe('registro desde el formulario', () => {
    it('registra la incidencia y la muestra en el listado', () => {
      const before = cards().length;

      fillAndSubmitForm();

      expect(cards().length).toBe(before + 1);
      expect(text()).toContain('Fuga en el aire acondicionado');
    });

    it('completa el reporterId con el usuario de la sesión', () => {
      const currentUser = TestBed.inject(UserService).currentUser();

      fillAndSubmitForm();

      const created = service.getAll().at(-1)!;
      expect(created.reporterId).toBe(currentUser.id);
      // El estado inicial y las fechas los pone el servicio, no el formulario.
      expect(created.status).toBe('OPEN');
      expect(created.id).toBe('inc-006');
    });

    it('actualiza los indicadores derivados', () => {
      const totalBefore = Number(stat('Totales'));
      const openBefore = Number(stat('Abiertas'));

      fillAndSubmitForm();

      expect(stat('Totales')).toBe(String(totalBefore + 1));
      expect(stat('Abiertas')).toBe(String(openBefore + 1));
    });

    function fillAndSubmitForm(): void {
      setValue('#incident-title', 'Fuga en el aire acondicionado', 'input');
      setValue('#incident-description', 'Gotea sobre los equipos del rack.', 'input');
      setValue('#incident-category', 'Infraestructura', 'input');
      setValue('#incident-priority', 'HIGH', 'change');

      fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    }

    function setValue(selector: string, value: string, eventName: string): void {
      const control: HTMLInputElement = fixture.nativeElement.querySelector(selector);
      control.value = value;
      control.dispatchEvent(new Event(eventName));
      fixture.detectChanges();
    }
  });

  function stat(label: string): string {
    const items = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.stats__item'));
    const item = items.find((candidate) =>
      candidate.querySelector('.stats__label')?.textContent?.trim() === label,
    );

    if (!item) {
      throw new Error(`No se encontró el indicador "${label}"`);
    }

    return item.querySelector('.stats__value')?.textContent?.trim() ?? '';
  }

  function counter(): string {
    return fixture.nativeElement.querySelector('.incident-list__count')?.textContent ?? '';
  }

  function input(selector: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(selector);
  }

  function type_(selector: string, value: string): void {
    const field = input(selector);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function select(selector: string, value: string): void {
    const field: HTMLSelectElement = fixture.nativeElement.querySelector(selector);
    field.value = value;
    field.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function cards(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('app-incident-card'));
  }

  function text(): string {
    return fixture.nativeElement.textContent ?? '';
  }

  /**
   * Nombre accesible por orden de prioridad: `aria-label`, después la
   * `<label for>` asociada (que es de donde lo toman `input` y `select`) y,
   * por último, el texto del propio elemento.
   */
  function accessibleName(element: HTMLElement): string {
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      return ariaLabel;
    }

    if (element.id) {
      const label = fixture.nativeElement.querySelector(`label[for="${element.id}"]`);
      if (label?.textContent?.trim()) {
        return label.textContent.trim();
      }
    }

    return element.textContent?.trim() ?? '';
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
