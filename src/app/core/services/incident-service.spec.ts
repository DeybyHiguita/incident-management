import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { IncidentService } from './incident-service';
import { MOCK_INCIDENTS } from '../mocks/incidents.mock';
import { Incident, IncidentDraft } from '../models/incident.model';
import { IncidentSearchCriteria } from '../models/incident-search-criteria.model';
import { failNextApiRequest } from '../api/fake-backend.interceptor';
import { loadIncidents, prepareApi, provideTestApi } from '../../testing/api-testing';

const DRAFT: IncidentDraft = {
  title: 'Fuga en el aire acondicionado',
  description: 'Gotea sobre los equipos del rack principal.',
  category: 'Infraestructura',
  priority: 'HIGH',
  reporterId: 'u-005',
};

describe('IncidentService', () => {
  let service: IncidentService;

  beforeEach(() => {
    prepareApi();
    TestBed.configureTestingModule({ providers: [provideTestApi()] });
  });

  /** Crea el servicio y espera a su carga inicial. */
  function start(): void {
    service = loadIncidents();
  }

  it('should be created', fakeAsync(() => {
    start();
    expect(service).toBeTruthy();
  }));

  it('se comparte como única instancia en toda la aplicación', fakeAsync(() => {
    start();
    expect(TestBed.inject(IncidentService)).toBe(service);
  }));

  describe('carga inicial', () => {
    it('pide las incidencias al crearse', fakeAsync(() => {
      start();

      expect(service.getAll().length).toBe(MOCK_INCIDENTS.length);
      expect(service.loaded()).toBe(true);
    }));

    it('mientras carga marca loading y luego lo apaga', fakeAsync(() => {
      const pending = TestBed.inject(IncidentService);
      expect(pending.loading()).toBe(true);

      tick();

      expect(pending.loading()).toBe(false);
    }));

    it('no hay error tras una carga correcta', fakeAsync(() => {
      start();
      expect(service.error()).toBeNull();
    }));
  });

  describe('consulta', () => {
    beforeEach(fakeAsync(() => start()));

    it('devuelve un arreglo nuevo, no la colección interna', () => {
      expect(service.getAll()).not.toBe(service.getAll());
    });

    it('modificar lo devuelto no altera el estado del servicio', () => {
      (service.getAll() as Incident[]).length = 0;

      expect(service.getAll().length).toBe(MOCK_INCIDENTS.length);
    });

    it('busca por identificador', () => {
      expect(service.getById('inc-001')?.title).toBe(MOCK_INCIDENTS[0].title);
    });

    it('devuelve undefined si el identificador no existe', () => {
      expect(service.getById('no-existe')).toBeUndefined();
    });

    it('filtra con los criterios de búsqueda del dominio', () => {
      const result = service.search(new IncidentSearchCriteria('', 'IN_PROGRESS'));

      expect(result.length).toBeGreaterThan(0);
      expect(result.every((incident) => incident.status === 'IN_PROGRESS')).toBe(true);
    });
  });

  describe('creación', () => {
    beforeEach(fakeAsync(() => start()));

    it('añade la incidencia y completa lo que decide el dominio', fakeAsync(() => {
      let created: Incident | undefined;
      service.create(DRAFT).subscribe((incident) => (created = incident));
      tick();

      expect(created!.id).toBe('inc-006');
      expect(created!.status).toBe('OPEN');
      expect(created!.createdAt).toBe(created!.updatedAt);
      expect(service.getAll().length).toBe(MOCK_INCIDENTS.length + 1);
    }));

    it('la colección solo cambia cuando el servidor confirma', fakeAsync(() => {
      service.create(DRAFT).subscribe();

      // Aún sin respuesta: nada de optimismo prematuro.
      expect(service.getAll().length).toBe(MOCK_INCIDENTS.length);

      tick();

      expect(service.getAll().length).toBe(MOCK_INCIDENTS.length + 1);
    }));

    it('la incidencia persiste en el servidor', fakeAsync(() => {
      service.create(DRAFT).subscribe();
      tick();

      // Se recarga desde cero: si solo estuviera en memoria, desaparecería.
      service.load();
      tick();

      expect(service.getAll().length).toBe(MOCK_INCIDENTS.length + 1);
    }));

    it('genera identificadores distintos en creaciones sucesivas', fakeAsync(() => {
      service.create(DRAFT).subscribe();
      tick();
      let second: Incident | undefined;
      service.create(DRAFT).subscribe((incident) => (second = incident));
      tick();

      expect(second!.id).toBe('inc-007');
    }));
  });

  describe('actualización', () => {
    beforeEach(fakeAsync(() => start()));

    it('aplica cambios parciales sin tocar el resto', fakeAsync(() => {
      const original = MOCK_INCIDENTS[0];
      let updated: Incident | undefined;

      service.update(original.id, { title: 'Título corregido' }).subscribe((i) => (updated = i));
      tick();

      expect(updated!.title).toBe('Título corregido');
      expect(updated!.description).toBe(original.description);
    }));

    it('conserva id y createdAt, y refresca updatedAt', fakeAsync(() => {
      const original = MOCK_INCIDENTS[0];
      let updated: Incident | undefined;

      service.update(original.id, { title: 'Título corregido' }).subscribe((i) => (updated = i));
      tick();

      expect(updated!.id).toBe(original.id);
      expect(updated!.createdAt).toBe(original.createdAt);
      expect(updated!.updatedAt).not.toBe(original.updatedAt);
    }));

    it('los cambios persisten en el servidor', fakeAsync(() => {
      service.update('inc-001', { priority: 'CRITICAL' }).subscribe();
      tick();

      service.load();
      tick();

      expect(service.getById('inc-001')?.priority).toBe('CRITICAL');
    }));

    it('recalcula los indicadores derivados', fakeAsync(() => {
      const before = service.criticalCount();

      service.update('inc-001', { priority: 'CRITICAL' }).subscribe();
      tick();

      expect(service.criticalCount()).toBe(before + 1);
    }));
  });

  describe('eliminación', () => {
    beforeEach(fakeAsync(() => start()));

    it('elimina la incidencia', fakeAsync(() => {
      service.remove('inc-001').subscribe();
      tick();

      expect(service.getById('inc-001')).toBeUndefined();
      expect(service.getAll().length).toBe(MOCK_INCIDENTS.length - 1);
    }));

    it('la eliminación persiste en el servidor', fakeAsync(() => {
      service.remove('inc-001').subscribe();
      tick();

      service.load();
      tick();

      expect(service.getById('inc-001')).toBeUndefined();
    }));

    it('informa del error si la incidencia no existe', fakeAsync(() => {
      let failed: Error | undefined;
      service.remove('no-existe').subscribe({ error: (e) => (failed = e) });
      tick();

      expect(failed?.message).toContain('No existe la incidencia');
      expect(service.error()).toBeTruthy();
    }));
  });

  describe('indicadores derivados', () => {
    beforeEach(fakeAsync(() => start()));

    it('cuentan el total, las críticas y las abiertas', () => {
      expect(service.totalCount()).toBe(MOCK_INCIDENTS.length);
      expect(service.criticalCount()).toBe(
        MOCK_INCIDENTS.filter((i) => i.priority === 'CRITICAL').length,
      );
      expect(service.openCount()).toBe(MOCK_INCIDENTS.filter((i) => i.status === 'OPEN').length);
    });

    it('se recalculan solos al eliminar', fakeAsync(() => {
      const critical = MOCK_INCIDENTS.find((i) => i.priority === 'CRITICAL')!;

      service.remove(critical.id).subscribe();
      tick();

      expect(service.criticalCount()).toBe(
        MOCK_INCIDENTS.filter((i) => i.priority === 'CRITICAL').length - 1,
      );
    }));

    it('son de solo lectura', () => {
      expect('set' in service.totalCount).toBe(false);
      expect('update' in service.totalCount).toBe(false);
    });
  });

  describe('errores', () => {
    it('registra el mensaje cuando la carga inicial falla', fakeAsync(() => {
      failNextApiRequest();
      service = TestBed.inject(IncidentService);
      tick();

      expect(service.error()).toBe('El servidor no pudo procesar la solicitud.');
      expect(service.getAll().length).toBe(0);
      // Se da por inicializado igualmente: no está cargando, simplemente falló.
      expect(service.loaded()).toBe(true);
      expect(service.loading()).toBe(false);
    }));

    it('el error se puede descartar', fakeAsync(() => {
      failNextApiRequest();
      service = TestBed.inject(IncidentService);
      tick();
      expect(service.error()).toBeTruthy();

      service.clearError();

      expect(service.error()).toBeNull();
    }));

    it('una petición correcta posterior limpia el error', fakeAsync(() => {
      failNextApiRequest();
      service = TestBed.inject(IncidentService);
      tick();
      expect(service.error()).toBeTruthy();

      service.load();
      tick();

      expect(service.error()).toBeNull();
      expect(service.getAll().length).toBe(MOCK_INCIDENTS.length);
    }));

    it('apaga el indicador de carga aunque la petición falle', fakeAsync(() => {
      failNextApiRequest();
      service = TestBed.inject(IncidentService);
      tick();

      expect(service.loading()).toBe(false);
    }));
  });

  describe('reactividad', () => {
    beforeEach(fakeAsync(() => start()));

    it('la señal expuesta es de solo lectura', () => {
      expect('set' in service.incidents).toBe(false);
      expect('update' in service.incidents).toBe(false);
    });

    it('no muta los datos simulados originales', fakeAsync(() => {
      const snapshot = MOCK_INCIDENTS.map((incident) => ({ ...incident }));

      service.create(DRAFT).subscribe();
      tick();
      service.remove('inc-001').subscribe();
      tick();

      expect(MOCK_INCIDENTS).toEqual(snapshot);
    }));
  });
});
