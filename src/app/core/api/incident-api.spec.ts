import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { IncidentApi } from './incident-api';
import { Incident } from '../models/incident.model';

const INCIDENT: Incident = {
  id: 'inc-001',
  title: 'No se puede iniciar sesión',
  description: 'Error 500 al autenticarse.',
  category: 'Autenticación',
  priority: 'HIGH',
  status: 'OPEN',
  reporterId: 'u-004',
  createdAt: '2026-07-27T09:15:00.000Z',
  updatedAt: '2026-07-27T09:15:00.000Z',
};

/**
 * Aquí no se usa el backend simulado: se comprueba que la capa construye
 * exactamente las peticiones esperadas (verbo, URL y cuerpo).
 */
describe('IncidentApi', () => {
  let api: IncidentApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    api = TestBed.inject(IncidentApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(api).toBeTruthy();
  });

  it('consulta la colección con GET', () => {
    let result: Incident[] | undefined;
    api.getAll().subscribe((incidents) => (result = incidents));

    const request = http.expectOne('/api/incidents');
    expect(request.request.method).toBe('GET');
    request.flush([INCIDENT]);

    expect(result).toEqual([INCIDENT]);
  });

  it('consulta una incidencia con GET y su id en la ruta', () => {
    api.getById('inc-001').subscribe();

    const request = http.expectOne('/api/incidents/inc-001');
    expect(request.request.method).toBe('GET');
    request.flush(INCIDENT);
  });

  it('crea con POST y envía la incidencia en el cuerpo', () => {
    api.create(INCIDENT).subscribe();

    const request = http.expectOne('/api/incidents');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(INCIDENT);
    request.flush(INCIDENT);
  });

  it('actualiza con PUT sobre la ruta del recurso', () => {
    api.update(INCIDENT).subscribe();

    const request = http.expectOne('/api/incidents/inc-001');
    expect(request.request.method).toBe('PUT');
    request.flush(INCIDENT);
  });

  it('elimina con DELETE', () => {
    api.remove('inc-001').subscribe();

    const request = http.expectOne('/api/incidents/inc-001');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('busca con el término como parámetro de consulta', () => {
    api.search('servidor').subscribe();

    const request = http.expectOne((r) => r.url === '/api/incidents');
    expect(request.request.params.get('search')).toBe('servidor');
    request.flush([]);
  });

  it('un término vacío no añade el parámetro', () => {
    api.search('   ').subscribe();

    const request = http.expectOne('/api/incidents');
    expect(request.request.params.has('search')).toBe(false);
    request.flush([]);
  });

  it('no traduce los errores: eso es cosa del interceptor (Día 18)', () => {
    let failure: unknown;
    api.getAll().subscribe({ error: (error) => (failure = error) });

    http.expectOne('/api/incidents').flush(null, { status: 500, statusText: 'Error' });

    // Sin interceptores, lo que llega es el error HTTP en crudo.
    expect((failure as { status: number }).status).toBe(500);
  });
});
