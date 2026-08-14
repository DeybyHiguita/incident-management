import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { loadIncidents, prepareApi, provideTestApi } from '../../../../testing/api-testing';
import { IncidentApi } from '../../../../core/api/incident-api';
import {
  failNextApiRequest,
  setFakeBackendLatency,
} from '../../../../core/api/fake-backend.interceptor';

/** Debe coincidir con el debounce del componente. */
const SEARCH_DEBOUNCE_MS = 300;

import { IncidentList } from './incident-list';
import { MOCK_INCIDENTS } from '../../../../core/mocks/incidents.mock';
import { IncidentStore } from '../../../../core/state/incident-store';

/** Ancho de referencia del teléfono más estrecho que soportamos. */
const NARROW_VIEWPORT_PX = 320;

describe('IncidentList', () => {
  let fixture: ComponentFixture<IncidentList>;
  let component: IncidentList;
  let store: IncidentStore;
  let api: IncidentApi;

  beforeEach(async () => {
    prepareApi();
    await TestBed.configureTestingModule({
      imports: [IncidentList],
      // El listado y las tarjetas usan routerLink desde el Día 13.
      providers: [provideRouter([]), provideTestApi()],
    }).compileComponents();
  });

  beforeEach(fakeAsync(() => {
    // El servicio carga desde la API en su constructor: se deja llegar la
    // respuesta antes de renderizar.
    store = loadIncidents();
    api = TestBed.inject(IncidentApi);

    fixture = TestBed.createComponent(IncidentList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renderiza una tarjeta hija por incidencia', () => {
    expect(cards().length).toBe(MOCK_INCIDENTS.length);
  });

  it('marca la tarjeta como seleccionada cuando el hijo emite el evento', fakeAsync(() => {
    clickIn(cards()[1], 'Seleccionar');

    expect(text()).toContain(MOCK_INCIDENTS[1].title);
    expect(cards()[1].querySelector('.incident-card--selected')).toBeTruthy();
  }));

  it('elimina la incidencia del contenedor cuando el hijo lo solicita', fakeAsync(() => {
    const removed = MOCK_INCIDENTS[0];

    clickIn(cards()[0], 'Eliminar incidencia');

    expect(cards().length).toBe(MOCK_INCIDENTS.length - 1);
    expect(text()).not.toContain(removed.title);
  }));

  it('no muta la colección original al eliminar (inmutabilidad)', fakeAsync(() => {
    const snapshot = [...MOCK_INCIDENTS];

    clickIn(cards()[0], 'Eliminar incidencia');

    expect(MOCK_INCIDENTS).toEqual(snapshot);
  }));

  it('delega la eliminación en el servicio en vez de gestionar los datos', fakeAsync(() => {
    spyOn(store, 'remove').and.callThrough();

    clickIn(cards()[0], 'Eliminar incidencia');

    expect(store.remove).toHaveBeenCalledWith(MOCK_INCIDENTS[0].id);
  }));

  it('refleja los cambios que otro consumidor haga en el servicio', fakeAsync(() => {
    // Nadie tocó el componente: el estado vive en el servicio y la vista
    // se actualiza sola porque lee una señal.
    store.remove(MOCK_INCIDENTS[0].id).subscribe();
    tick();
    fixture.detectChanges();

    expect(cards().length).toBe(MOCK_INCIDENTS.length - 1);
    expect(text()).not.toContain(MOCK_INCIDENTS[0].title);
  }));

  it('muestra el estado vacío al eliminar todas y permite restaurar', fakeAsync(() => {
    while (cards().length > 0) {
      clickIn(cards()[0], 'Eliminar incidencia');
    }

    expect(text()).toContain('No hay incidencias registradas.');

    // Recargar ya no las devuelve: desde el Día 15 la eliminación llega al
    // servidor, así que la lista sigue vacía tras volver a pedirla.
    clickIn(fixture.nativeElement, 'Recargar');

    expect(cards().length).toBe(0);
  }));

  // --- Día 6: accesibilidad y diseño adaptable -----------------------------

  it('agrupa las tarjetas en una lista semántica', () => {
    const items = fixture.nativeElement.querySelectorAll('ul.incident-list-grid > li');

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

  it('anuncia el cambio de selección en una región aria-live', fakeAsync(() => {
    const live: HTMLElement = fixture.nativeElement.querySelector(
      '.incident-list-selection[aria-live="polite"]',
    );

    expect(live.textContent).toContain('Ninguna incidencia seleccionada');

    clickIn(cards()[0], 'Seleccionar');

    expect(live.textContent).toContain(MOCK_INCIDENTS[0].title);
  }));

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

  it('el botón de recargar solo se deshabilita mientras hay una petición en curso', () => {
    expect(findIn(fixture.nativeElement, 'Recargar').disabled).toBe(false);
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

    it('se actualizan solos al eliminar, sin tocar el componente', fakeAsync(() => {
      const critical = MOCK_INCIDENTS.find((i) => i.priority === 'CRITICAL')!;
      const criticalBefore = Number(stat('Críticas'));

      store.remove(critical.id).subscribe();
      tick();
      fixture.detectChanges();

      expect(stat('Totales')).toBe(String(MOCK_INCIDENTS.length - 1));
      expect(stat('Críticas')).toBe(String(criticalBefore - 1));
    }));
  });

  describe('búsqueda reactiva (Día 16)', () => {
    it('no consulta al servidor en cada tecla, solo al parar de escribir', fakeAsync(() => {
      const spy = spyOn(api, 'search').and.callThrough();

      type_('#search-term', 'i');
      type_('#search-term', 'im');
      type_('#search-term', 'imp');
      // Aún dentro de la ventana de espera: ninguna petición.
      expect(spy).not.toHaveBeenCalled();

      tick(SEARCH_DEBOUNCE_MS);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('imp');
      finish();
    }));

    it('filtra por término contra el servidor', fakeAsync(() => {
      search('impresora');

      expect(cards().length).toBe(1);
      expect(text()).toContain('Impresora de red desconectada');
    }));

    it('el término no distingue mayúsculas', fakeAsync(() => {
      search('IMPRESORA');

      expect(cards().length).toBe(1);
    }));

    it('evita solicitudes duplicadas cuando el término efectivo no cambia', fakeAsync(() => {
      search('red');
      const spy = spyOn(api, 'search').and.callThrough();

      // Los espacios se recortan: para el servidor sigue siendo «red».
      type_('#search-term', 'red ');
      tick(SEARCH_DEBOUNCE_MS);
      type_('#search-term', 'red');
      tick(SEARCH_DEBOUNCE_MS);

      expect(spy).not.toHaveBeenCalled();
      finish();
    }));

    it('cancela la búsqueda anterior al cambiar el término', fakeAsync(() => {
      // Con latencia, una respuesta vieja podría llegar después de una nueva.
      setFakeBackendLatency(50);

      type_('#search-term', 'impresora');
      tick(SEARCH_DEBOUNCE_MS);
      // Sin esperar la respuesta, se cambia el término.
      type_('#search-term', 'servidor');
      tick(SEARCH_DEBOUNCE_MS + 100);
      fixture.detectChanges();

      // Gana el último, no el más lento.
      expect(cards().length).toBe(1);
      expect(text()).toContain('Caída del servidor de facturación');
      setFakeBackendLatency(0);
      finish();
    }));

    it('muestra el estado de carga mientras busca', fakeAsync(() => {
      setFakeBackendLatency(50);

      type_('#search-term', 'servidor');
      tick(SEARCH_DEBOUNCE_MS);
      fixture.detectChanges();
      expect(hint()).toContain('Buscando');

      tick(100);
      fixture.detectChanges();

      expect(hint()).not.toContain('Buscando');
      setFakeBackendLatency(0);
      finish();
    }));

    it('informa del error sin romper el flujo: se puede seguir buscando', fakeAsync(() => {
      failNextApiRequest();

      search('servidor');
      expect(hint()).toContain('El servidor no pudo procesar la solicitud.');

      // El flujo sigue vivo: la búsqueda siguiente funciona.
      search('impresora');

      expect(hint()).not.toContain('El servidor no pudo');
      expect(cards().length).toBe(1);
    }));

    it('un término sin coincidencias muestra el mensaje de filtros', fakeAsync(() => {
      search('texto que no aparece en ninguna parte');

      expect(cards().length).toBe(0);
      expect(text()).toContain('Ninguna incidencia coincide con los filtros aplicados');
    }));
  });

  describe('filtros locales', () => {
    it('filtra por estado', fakeAsync(() => {
      select('#status-filter', 'IN_PROGRESS');

      expect(cards().length).toBe(
        MOCK_INCIDENTS.filter((i) => i.status === 'IN_PROGRESS').length,
      );
      finish();
    }));

    it('filtra por prioridad', fakeAsync(() => {
      select('#priority-filter', 'CRITICAL');

      expect(cards().length).toBe(
        MOCK_INCIDENTS.filter((i) => i.priority === 'CRITICAL').length,
      );
      finish();
    }));

    it('combina búsqueda remota y filtros locales', fakeAsync(() => {
      search('servidor');
      select('#priority-filter', 'LOW');

      // «servidor» encuentra una crítica, así que el filtro LOW la descarta.
      expect(cards().length).toBe(0);
      finish();
    }));

    it('actualiza el contador de resultados sin cambiar el total', fakeAsync(() => {
      select('#priority-filter', 'CRITICAL');

      const critical = MOCK_INCIDENTS.filter((i) => i.priority === 'CRITICAL').length;
      expect(counter()).toContain(`Mostrando ${critical} de ${MOCK_INCIDENTS.length}`);
      expect(stat('Totales')).toBe(String(MOCK_INCIDENTS.length));
      finish();
    }));

    it('limpia todos los filtros de una vez', fakeAsync(() => {
      search('impresora');
      select('#priority-filter', 'LOW');
      expect(cards().length).toBe(1);

      findIn(fixture.nativeElement, 'Limpiar filtros').click();
      finish();
      fixture.detectChanges();

      expect(cards().length).toBe(MOCK_INCIDENTS.length);
      expect(input('#search-term').value).toBe('');
    }));

    it('deshabilita el botón de limpiar cuando no hay filtros activos', fakeAsync(() => {
      expect(findIn(fixture.nativeElement, 'Limpiar filtros').disabled).toBe(true);

      type_('#search-term', 'a');

      expect(findIn(fixture.nativeElement, 'Limpiar filtros').disabled).toBe(false);
      finish();
    }));

    it('el resultado deja de mostrarse cuando la incidencia se elimina', fakeAsync(() => {
      search('impresora');
      expect(cards().length).toBe(1);

      const impresora = MOCK_INCIDENTS.find((i) => i.title.includes('Impresora'))!;
      store.remove(impresora.id).subscribe();
      tick();
      fixture.detectChanges();

      // Sin repetir la búsqueda: los resultados se cruzan con la colección viva.
      expect(cards().length).toBe(0);
      finish();
    }));
  });

  // --- Día 17: suscripciones y ciclo de vida -------------------------------

  describe('temporizador de refresco automático', () => {
    const AUTO_REFRESH_MS = 30_000;

    it('arranca apagado y sin ningún temporizador activo', fakeAsync(() => {
      expect(component['autoRefresh']()).toBe(false);

      // Si hubiera un interval corriendo, fakeAsync se quejaría al terminar.
      tick(AUTO_REFRESH_MS * 2);
      finish();
    }));

    it('recarga periódicamente mientras está activo', fakeAsync(() => {
      const spy = spyOn(store, 'load').and.callThrough();

      toggleAutoRefresh();

      tick(AUTO_REFRESH_MS);
      expect(spy).toHaveBeenCalledTimes(1);

      tick(AUTO_REFRESH_MS);
      expect(spy).toHaveBeenCalledTimes(2);

      // Se apaga para no dejar temporizadores pendientes.
      toggleAutoRefresh();
      finish();
    }));

    it('al apagarlo se cancela el temporizador, no solo se ignoran sus avisos', fakeAsync(() => {
      toggleAutoRefresh();
      tick(AUTO_REFRESH_MS);

      toggleAutoRefresh();
      const spy = spyOn(store, 'load').and.callThrough();

      tick(AUTO_REFRESH_MS * 3);

      expect(spy).not.toHaveBeenCalled();
      finish();
    }));

    it('el temporizador muere con el componente', fakeAsync(() => {
      toggleAutoRefresh();
      const spy = spyOn(store, 'load').and.callThrough();

      fixture.destroy();
      tick(AUTO_REFRESH_MS * 3);

      // Sin takeUntilDestroyed, esto seguiría recargando para siempre.
      expect(spy).not.toHaveBeenCalled();
    }));
  });

  describe('listener del navegador', () => {
    it('recarga al recuperar la conexión', fakeAsync(() => {
      const spy = spyOn(store, 'load').and.callThrough();

      window.dispatchEvent(new Event('online'));
      tick();

      expect(spy).toHaveBeenCalled();
      finish();
    }));

    it('se da de baja al destruir el componente', fakeAsync(() => {
      fixture.destroy();
      const spy = spyOn(store, 'load').and.callThrough();

      window.dispatchEvent(new Event('online'));
      tick();

      // `addEventListener` no lo limpia Angular: sin el DestroyRef.onDestroy
      // este listener sobreviviría a la página.
      expect(spy).not.toHaveBeenCalled();
    }));
  });

  it('una eliminación en vuelo no afecta al componente ya destruido', fakeAsync(() => {
    setFakeBackendLatency(50);
    const before = store.getAll().length;

    findIn(cards()[0], 'Eliminar incidencia').click();
    fixture.destroy();
    tick(100);

    // La suscripción se cortó con el componente: el servicio no se actualiza
    // desde una vista que ya no existe.
    expect(store.getAll().length).toBe(before);
    setFakeBackendLatency(0);
  }));

  it('el refresco automático es una casilla con etiqueta asociada', () => {
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('#auto-refresh');
    const label = fixture.nativeElement.querySelector('label[for="auto-refresh"]');

    expect(checkbox.type).toBe('checkbox');
    expect(checkbox.checked).toBe(false);
    expect(label.textContent.trim()).toBe('Refresco automático');
  });

  /** Activa o desactiva el refresco automático desde la casilla. */
  function toggleAutoRefresh(): void {
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('#auto-refresh');
    checkbox.click();
    fixture.detectChanges();
  }

  /** Escribe un término y espera a que llegue la respuesta del servidor. */
  function search(term: string): void {
    type_('#search-term', term);
    tick(SEARCH_DEBOUNCE_MS);
    tick();
    fixture.detectChanges();
  }

  /** Agota temporizadores pendientes para que fakeAsync no proteste. */
  function finish(): void {
    tick(SEARCH_DEBOUNCE_MS);
    tick();
  }

  function hint(): string {
    return fixture.nativeElement.querySelector('#search-hint')?.textContent ?? '';
  }

  function stat(label: string): string {
    const items = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.stats-item'));
    const item = items.find((candidate) =>
      candidate.querySelector('.stats-label')?.textContent?.trim() === label,
    );

    if (!item) {
      throw new Error(`No se encontró el indicador "${label}"`);
    }

    return item.querySelector('.stats-value')?.textContent?.trim() ?? '';
  }

  function counter(): string {
    return fixture.nativeElement.querySelector('.incident-list-count')?.textContent ?? '';
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
    // Las acciones que llaman a la API resuelven en el siguiente turno.
    tick();
    fixture.detectChanges();
  }
});
