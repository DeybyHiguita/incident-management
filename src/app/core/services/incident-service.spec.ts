import { TestBed } from '@angular/core/testing';

import { IncidentService } from './incident-service';
import { MOCK_INCIDENTS } from '../mocks/incidents.mock';
import { Incident, IncidentDraft } from '../models/incident.model';
import { IncidentSearchCriteria } from '../models/incident-search-criteria.model';

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
    TestBed.configureTestingModule({});
    service = TestBed.inject(IncidentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('se comparte como única instancia en toda la aplicación', () => {
    // providedIn: 'root' — dos inyecciones devuelven el mismo objeto.
    expect(TestBed.inject(IncidentService)).toBe(service);
  });

  describe('consulta', () => {
    it('arranca con los datos simulados', () => {
      expect(service.getAll().length).toBe(MOCK_INCIDENTS.length);
    });

    it('devuelve un arreglo nuevo, no la colección interna', () => {
      const first = service.getAll();
      const second = service.getAll();

      expect(first).not.toBe(second);
      expect(first).toEqual(second);
    });

    it('modificar lo devuelto no altera el estado del servicio', () => {
      const copy = service.getAll() as Incident[];
      copy.length = 0;

      expect(service.getAll().length).toBe(MOCK_INCIDENTS.length);
    });

    it('busca por identificador', () => {
      expect(service.getById('inc-001')?.title).toBe(MOCK_INCIDENTS[0].title);
    });

    it('devuelve undefined si el identificador no existe', () => {
      expect(service.getById('no-existe')).toBeUndefined();
    });

    it('filtra con los criterios de búsqueda del dominio', () => {
      const criteria = new IncidentSearchCriteria('', 'IN_PROGRESS');

      const result = service.search(criteria);

      expect(result.length).toBeGreaterThan(0);
      expect(result.every((incident) => incident.status === 'IN_PROGRESS')).toBe(true);
    });
  });

  describe('creación', () => {
    it('añade la incidencia y completa los datos que decide el dominio', () => {
      const created = service.create(DRAFT);

      expect(created.id).toBe('inc-006');
      expect(created.status).toBe('OPEN');
      expect(created.createdAt).toBe(created.updatedAt);
      expect(Number.isNaN(Date.parse(created.createdAt))).toBe(false);
      expect(created.title).toBe(DRAFT.title);
    });

    it('incrementa el total y la incidencia queda consultable', () => {
      const created = service.create(DRAFT);

      expect(service.getAll().length).toBe(MOCK_INCIDENTS.length + 1);
      expect(service.getById(created.id)).toEqual(created);
    });

    it('genera identificadores distintos en creaciones sucesivas', () => {
      const first = service.create(DRAFT);
      const second = service.create(DRAFT);

      expect(first.id).not.toBe(second.id);
      expect(second.id).toBe('inc-007');
    });

    it('respeta el estado indicado en el borrador si viene dado', () => {
      const created = service.create({ ...DRAFT, status: 'IN_PROGRESS' });

      expect(created.status).toBe('IN_PROGRESS');
    });

    it('no muta los datos simulados originales', () => {
      const snapshot = [...MOCK_INCIDENTS];

      service.create(DRAFT);

      expect(MOCK_INCIDENTS).toEqual(snapshot);
      expect(MOCK_INCIDENTS.length).toBe(snapshot.length);
    });
  });

  describe('eliminación', () => {
    it('elimina la incidencia y lo confirma', () => {
      expect(service.remove('inc-001')).toBe(true);

      expect(service.getById('inc-001')).toBeUndefined();
      expect(service.getAll().length).toBe(MOCK_INCIDENTS.length - 1);
    });

    it('devuelve false si no había nada que eliminar', () => {
      expect(service.remove('no-existe')).toBe(false);
      expect(service.getAll().length).toBe(MOCK_INCIDENTS.length);
    });

    it('no muta los datos simulados originales', () => {
      const snapshot = [...MOCK_INCIDENTS];

      service.remove('inc-001');

      expect(MOCK_INCIDENTS).toEqual(snapshot);
    });
  });

  describe('reinicio', () => {
    it('vuelve al conjunto inicial', () => {
      service.remove('inc-001');
      service.create(DRAFT);
      expect(service.isPristine()).toBe(false);

      service.reset();

      expect(service.getAll().length).toBe(MOCK_INCIDENTS.length);
      expect(service.isPristine()).toBe(true);
    });
  });

  describe('reactividad', () => {
    it('la señal expuesta refleja los cambios', () => {
      const before = service.incidents().length;

      service.create(DRAFT);

      expect(service.incidents().length).toBe(before + 1);
    });

    it('la señal expuesta es de solo lectura', () => {
      // `asReadonly()` no expone `set` ni `update`: el estado solo cambia
      // llamando a los métodos del servicio.
      expect('set' in service.incidents).toBe(false);
      expect('update' in service.incidents).toBe(false);
    });
  });
});
