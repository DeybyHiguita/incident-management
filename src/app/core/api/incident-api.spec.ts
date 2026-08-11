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

  describe('traducción de errores', () => {
    it('convierte un 404 en un mensaje legible', () => {
      let failed: Error | undefined;
      api.getById('inc-999').subscribe({ error: (error) => (failed = error) });

      http
        .expectOne('/api/incidents/inc-999')
        .flush(null, { status: 404, statusText: 'Not Found' });

      expect(failed).toEqual(jasmine.any(Error));
      expect(failed?.message).toBe('La incidencia solicitada no existe.');
    });

    it('convierte un 500 en un mensaje legible', () => {
      let failed: Error | undefined;
      api.getAll().subscribe({ error: (error) => (failed = error) });

      http.expectOne('/api/incidents').flush(null, { status: 500, statusText: 'Server Error' });

      expect(failed?.message).toBe('El servidor no pudo procesar la solicitud.');
    });

    it('avisa de la falta de conexión', () => {
      let failed: Error | undefined;
      api.getAll().subscribe({ error: (error) => (failed = error) });

      http.expectOne('/api/incidents').error(new ProgressEvent('error'));

      expect(failed?.message).toBe('No hay conexión con el servidor.');
    });

    it('prefiere el mensaje que envía el propio servidor', () => {
      let failed: Error | undefined;
      api.getAll().subscribe({ error: (error) => (failed = error) });

      http
        .expectOne('/api/incidents')
        .flush({ message: 'Mantenimiento programado.' }, { status: 503, statusText: 'Unavailable' });

      expect(failed?.message).toBe('Mantenimiento programado.');
    });
  });
});
