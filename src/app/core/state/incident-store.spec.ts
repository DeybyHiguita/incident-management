import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { IncidentStore } from './incident-store';
import { MOCK_INCIDENTS } from '../mocks/incidents.mock';
import { Incident, IncidentDraft } from '../models/incident.model';
import { failNextApiRequest } from '../api/fake-backend.interceptor';
import { loadIncidents, prepareApi, provideTestApi } from '../../testing/api-testing';

const DRAFT: IncidentDraft = {
  title: 'Fuga en el aire acondicionado',
  description: 'Gotea sobre los equipos del rack principal.',
  category: 'Infraestructura',
  priority: 'HIGH',
  reporterId: 'u-005',
};

describe('IncidentStore', () => {
  let store: IncidentStore;

  beforeEach(() => {
    prepareApi();
    TestBed.configureTestingModule({ providers: [provideTestApi()] });
  });

  /** Crea el servicio y espera a su carga inicial. */
  function start(): void {
    store = loadIncidents();
  }

  it('should be created', fakeAsync(() => {
    start();
    expect(store).toBeTruthy();
  }));

  it('se comparte como única instancia en toda la aplicación', fakeAsync(() => {
    start();
    expect(TestBed.inject(IncidentStore)).toBe(store);
  }));

  describe('carga inicial', () => {
    it('pide las incidencias al crearse', fakeAsync(() => {
      start();

      expect(store.getAll().length).toBe(MOCK_INCIDENTS.length);
      expect(store.loaded()).toBe(true);
    }));

    it('mientras carga marca loading y luego lo apaga', fakeAsync(() => {
      const pending = TestBed.inject(IncidentStore);
      expect(pending.loading()).toBe(true);

      tick();

      expect(pending.loading()).toBe(false);
    }));

    it('no hay error tras una carga correcta', fakeAsync(() => {
      start();
      expect(store.error()).toBeNull();
    }));
  });

  describe('consulta', () => {
    beforeEach(fakeAsync(() => start()));

    it('devuelve un arreglo nuevo, no la colección interna', () => {
      expect(store.getAll()).not.toBe(store.getAll());
    });

    it('modificar lo devuelto no altera el estado del servicio', () => {
      (store.getAll() as Incident[]).length = 0;

      expect(store.getAll().length).toBe(MOCK_INCIDENTS.length);
    });

    it('busca por identificador', () => {
      expect(store.getById('inc-001')?.title).toBe(MOCK_INCIDENTS[0].title);
    });

    it('devuelve undefined si el identificador no existe', () => {
      expect(store.getById('no-existe')).toBeUndefined();
    });
  });

  describe('creación', () => {
    beforeEach(fakeAsync(() => start()));

    it('añade la incidencia y completa lo que decide el dominio', fakeAsync(() => {
      let created: Incident | undefined;
      store.create(DRAFT).subscribe((incident) => (created = incident));
      tick();

      expect(created!.id).toBe('inc-006');
      expect(created!.status).toBe('OPEN');
      expect(created!.createdAt).toBe(created!.updatedAt);
      expect(store.getAll().length).toBe(MOCK_INCIDENTS.length + 1);
    }));

    it('la colección solo cambia cuando el servidor confirma', fakeAsync(() => {
      store.create(DRAFT).subscribe();

      // Aún sin respuesta: nada de optimismo prematuro.
      expect(store.getAll().length).toBe(MOCK_INCIDENTS.length);

      tick();

      expect(store.getAll().length).toBe(MOCK_INCIDENTS.length + 1);
    }));

    it('la incidencia persiste en el servidor', fakeAsync(() => {
      store.create(DRAFT).subscribe();
      tick();

      // Se recarga desde cero: si solo estuviera en memoria, desaparecería.
      store.load();
      tick();

      expect(store.getAll().length).toBe(MOCK_INCIDENTS.length + 1);
    }));

    it('genera identificadores distintos en creaciones sucesivas', fakeAsync(() => {
      store.create(DRAFT).subscribe();
      tick();
      let second: Incident | undefined;
      store.create(DRAFT).subscribe((incident) => (second = incident));
      tick();

      expect(second!.id).toBe('inc-007');
    }));
  });

  describe('actualización', () => {
    beforeEach(fakeAsync(() => start()));

    it('aplica cambios parciales sin tocar el resto', fakeAsync(() => {
      const original = MOCK_INCIDENTS[0];
      let updated: Incident | undefined;

      store.update(original.id, { title: 'Título corregido' }).subscribe((i) => (updated = i));
      tick();

      expect(updated!.title).toBe('Título corregido');
      expect(updated!.description).toBe(original.description);
    }));

    it('conserva id y createdAt, y refresca updatedAt', fakeAsync(() => {
      const original = MOCK_INCIDENTS[0];
      let updated: Incident | undefined;

      store.update(original.id, { title: 'Título corregido' }).subscribe((i) => (updated = i));
      tick();

      expect(updated!.id).toBe(original.id);
      expect(updated!.createdAt).toBe(original.createdAt);
      expect(updated!.updatedAt).not.toBe(original.updatedAt);
    }));

    it('los cambios persisten en el servidor', fakeAsync(() => {
      store.update('inc-001', { priority: 'CRITICAL' }).subscribe();
      tick();

      store.load();
      tick();

      expect(store.getById('inc-001')?.priority).toBe('CRITICAL');
    }));

    it('recalcula los indicadores derivados', fakeAsync(() => {
      const before = store.criticalCount();

      store.update('inc-001', { priority: 'CRITICAL' }).subscribe();
      tick();

      expect(store.criticalCount()).toBe(before + 1);
    }));
  });

  describe('eliminación', () => {
    beforeEach(fakeAsync(() => start()));

    it('elimina la incidencia', fakeAsync(() => {
      store.remove('inc-001').subscribe();
      tick();

      expect(store.getById('inc-001')).toBeUndefined();
      expect(store.getAll().length).toBe(MOCK_INCIDENTS.length - 1);
    }));

    it('la eliminación persiste en el servidor', fakeAsync(() => {
      store.remove('inc-001').subscribe();
      tick();

      store.load();
      tick();

      expect(store.getById('inc-001')).toBeUndefined();
    }));

    it('informa del error si la incidencia no existe', fakeAsync(() => {
      let failed: Error | undefined;
      store.remove('no-existe').subscribe({ error: (e) => (failed = e) });
      tick();

      expect(failed?.message).toContain('No existe la incidencia');
      expect(store.error()).toBeTruthy();
    }));
  });

  describe('indicadores derivados', () => {
    beforeEach(fakeAsync(() => start()));

    it('cuentan el total, las críticas y las abiertas', () => {
      expect(store.totalCount()).toBe(MOCK_INCIDENTS.length);
      expect(store.criticalCount()).toBe(
        MOCK_INCIDENTS.filter((i) => i.priority === 'CRITICAL').length,
      );
      expect(store.openCount()).toBe(MOCK_INCIDENTS.filter((i) => i.status === 'OPEN').length);
    });

    it('se recalculan solos al eliminar', fakeAsync(() => {
      const critical = MOCK_INCIDENTS.find((i) => i.priority === 'CRITICAL')!;

      store.remove(critical.id).subscribe();
      tick();

      expect(store.criticalCount()).toBe(
        MOCK_INCIDENTS.filter((i) => i.priority === 'CRITICAL').length - 1,
      );
    }));

    it('son de solo lectura', () => {
      expect('set' in store.totalCount).toBe(false);
      expect('update' in store.totalCount).toBe(false);
    });
  });

  describe('errores', () => {
    it('registra el mensaje cuando la carga inicial falla', fakeAsync(() => {
      failNextApiRequest();
      store = TestBed.inject(IncidentStore);
      tick();

      expect(store.error()).toBe('El servidor no pudo procesar la solicitud.');
      expect(store.getAll().length).toBe(0);
      // Se da por inicializado igualmente: no está cargando, simplemente falló.
      expect(store.loaded()).toBe(true);
      expect(store.loading()).toBe(false);
    }));

    it('el error se puede descartar', fakeAsync(() => {
      failNextApiRequest();
      store = TestBed.inject(IncidentStore);
      tick();
      expect(store.error()).toBeTruthy();

      store.clearError();

      expect(store.error()).toBeNull();
    }));

    it('una petición correcta posterior limpia el error', fakeAsync(() => {
      failNextApiRequest();
      store = TestBed.inject(IncidentStore);
      tick();
      expect(store.error()).toBeTruthy();

      store.load();
      tick();

      expect(store.error()).toBeNull();
      expect(store.getAll().length).toBe(MOCK_INCIDENTS.length);
    }));

    it('apaga el indicador de carga aunque la petición falle', fakeAsync(() => {
      failNextApiRequest();
      store = TestBed.inject(IncidentStore);
      tick();

      expect(store.loading()).toBe(false);
    }));
  });

  describe('selección', () => {
    beforeEach(fakeAsync(() => start()));

    it('arranca sin nada seleccionado', () => {
      expect(store.selectedId()).toBeNull();
      expect(store.selectedIncident()).toBeUndefined();
    });

    it('selecciona por identificador', () => {
      store.select('inc-002');

      expect(store.selectedId()).toBe('inc-002');
      expect(store.selectedIncident()?.title).toBe(MOCK_INCIDENTS[1].title);
    });

    it('volver a seleccionar la misma la deselecciona', () => {
      store.select('inc-002');
      store.select('inc-002');

      expect(store.selectedId()).toBeNull();
    });

    it('al eliminar la seleccionada, la selección se limpia', fakeAsync(() => {
      store.select('inc-002');

      store.remove('inc-002').subscribe();
      tick();

      expect(store.selectedId()).toBeNull();
    }));

    it('eliminar otra no toca la selección', fakeAsync(() => {
      store.select('inc-002');

      store.remove('inc-001').subscribe();
      tick();

      expect(store.selectedId()).toBe('inc-002');
    }));
  });

  describe('filtros', () => {
    beforeEach(fakeAsync(() => start()));

    it('arranca sin filtros activos', () => {
      expect(store.hasActiveFilters()).toBe(false);
      expect(store.visibleCount()).toBe(MOCK_INCIDENTS.length);
    });

    it('cambia un filtro conservando los demás', () => {
      store.setFilters({ status: 'OPEN' });
      store.setFilters({ priority: 'HIGH' });

      expect(store.filters()).toEqual({ search: '', status: 'OPEN', priority: 'HIGH' });
    });

    it('filtra la lista visible sin tocar la colección', () => {
      store.setFilters({ priority: 'CRITICAL' });

      const critical = MOCK_INCIDENTS.filter((i) => i.priority === 'CRITICAL').length;
      expect(store.visibleCount()).toBe(critical);
      // Los indicadores siguen contando sobre el total.
      expect(store.totalCount()).toBe(MOCK_INCIDENTS.length);
    });

    it('los limpia todos de una vez', () => {
      store.setFilters({ search: 'red', status: 'OPEN', priority: 'HIGH' });

      store.clearFilters();

      expect(store.hasActiveFilters()).toBe(false);
      expect(store.visibleCount()).toBe(MOCK_INCIDENTS.length);
    });
  });

  describe('encapsulación del estado', () => {
    beforeEach(fakeAsync(() => start()));

    const readOnlySignals = [
      'incidents',
      'filters',
      'error',
      'loaded',
      'selectedId',
    ] as const;

    for (const name of readOnlySignals) {
      it(`la señal "${name}" no se puede escribir desde fuera`, () => {
        const exposed = store[name] as unknown as Record<string, unknown>;

        expect('set' in exposed).toBe(false);
        expect('update' in exposed).toBe(false);
      });
    }

    it('los selectores derivados tampoco', () => {
      for (const selector of [store.totalCount, store.visibleIncidents, store.selectedIncident]) {
        expect('set' in selector).toBe(false);
      }
    });

    it('escribir en el estado exige pasar por una acción', () => {
      // Matiz importante: `private` es de TypeScript y desaparece al
      // compilar, así que los campos internos **sí** existen en tiempo de
      // ejecución. Lo que de verdad impide escribirlos desde fuera son dos
      // cosas: el compilador (un componente no compila si lo intenta) y
      // `asReadonly()`, que quita `set` y `update` de lo que se expone.
      const exposed = store.incidents as unknown as Record<string, unknown>;
      const internal = (store as unknown as Record<string, { set?: unknown }>)['incidentList'];

      expect('set' in exposed).toBe(false);
      // La señal interna sí es escribible: por eso no se expone nunca.
      expect(typeof internal.set).toBe('function');
    });

    it('cambiar el estado solo surte efecto a través de las acciones', () => {
      const before = store.filters();

      store.setFilters({ status: 'OPEN' });

      expect(store.filters()).not.toEqual(before);
      expect(store.filters().status).toBe('OPEN');
    });

    it('modificar lo que devuelve getAll no altera el estado', () => {
      (store.getAll() as Incident[]).length = 0;

      expect(store.totalCount()).toBe(MOCK_INCIDENTS.length);
    });
  });

  describe('reactividad', () => {
    beforeEach(fakeAsync(() => start()));

    it('la señal expuesta es de solo lectura', () => {
      expect('set' in store.incidents).toBe(false);
      expect('update' in store.incidents).toBe(false);
    });

    it('no muta los datos simulados originales', fakeAsync(() => {
      const snapshot = MOCK_INCIDENTS.map((incident) => ({ ...incident }));

      store.create(DRAFT).subscribe();
      tick();
      store.remove('inc-001').subscribe();
      tick();

      expect(MOCK_INCIDENTS).toEqual(snapshot);
    }));
  });
});
