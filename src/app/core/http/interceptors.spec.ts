import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { CORRELATION_ID_HEADER, correlationIdInterceptor } from './correlation-id.interceptor';
import { AppHttpError, errorHandlingInterceptor } from './error-handling.interceptor';
import { loadingInterceptor } from './loading.interceptor';
import { LoadingService } from '../services/loading-service';

const URL = '/api/incidents';

describe('interceptores HTTP', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([correlationIdInterceptor, loadingInterceptor, errorHandlingInterceptor]),
        ),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  describe('correlationIdInterceptor', () => {
    it('añade la cabecera de correlación a la petición', () => {
      http.get(URL).subscribe();

      const request = backend.expectOne(URL);

      expect(request.request.headers.has(CORRELATION_ID_HEADER)).toBe(true);
      expect(request.request.headers.get(CORRELATION_ID_HEADER)).toBeTruthy();
      request.flush([]);
    });

    it('usa un identificador distinto en cada petición', () => {
      http.get(URL).subscribe();
      http.get(URL).subscribe();

      const [first, second] = backend.match(URL);
      const firstId = first.request.headers.get(CORRELATION_ID_HEADER);
      const secondId = second.request.headers.get(CORRELATION_ID_HEADER);

      expect(firstId).not.toBe(secondId);
      first.flush([]);
      second.flush([]);
    });

    it('no altera el resto de la petición', () => {
      http.post(URL, { title: 'Una incidencia' }).subscribe();

      const request = backend.expectOne(URL);

      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ title: 'Una incidencia' });
      request.flush({});
    });
  });

  describe('errorHandlingInterceptor', () => {
    const cases: readonly (readonly [number, string])[] = [
      [400, 'Los datos enviados no son válidos. Revisa el formulario e inténtalo de nuevo.'],
      [401, 'Tu sesión ha caducado. Vuelve a iniciar sesión.'],
      [403, 'No tienes permisos para realizar esta acción.'],
      [404, 'El recurso solicitado no existe.'],
      [500, 'El servidor no pudo procesar la solicitud. Inténtalo más tarde.'],
    ];

    for (const [status, message] of cases) {
      it(`traduce el ${status} a su mensaje`, () => {
        const failure = failWith(status);

        expect(failure?.message).toBe(message);
        expect(failure?.status).toBe(status);
      });
    }

    it('avisa de la falta de conexión cuando la petición no llega a salir', () => {
      let failure: AppHttpError | undefined;
      http.get(URL).subscribe({ error: (error) => (failure = error) });

      backend.expectOne(URL).error(new ProgressEvent('error'));

      expect(failure?.message).toBe('No hay conexión con el servidor. Comprueba tu red.');
    });

    it('prefiere el mensaje que envía el servidor', () => {
      let failure: AppHttpError | undefined;
      http.get(URL).subscribe({ error: (error) => (failure = error) });

      backend
        .expectOne(URL)
        .flush({ message: 'Mantenimiento programado.' }, { status: 503, statusText: 'x' });

      expect(failure?.message).toBe('Mantenimiento programado.');
    });

    it('tiene un mensaje de respaldo para códigos no contemplados', () => {
      expect(failWith(418)?.message).toBe('Error inesperado del servidor (418).');
    });

    it('el error entrega el identificador de correlación para soporte', () => {
      const failure = failWith(500);

      expect(failure?.correlationId).toBeTruthy();
    });

    it('el error que reciben los servicios ya no es un HttpErrorResponse', () => {
      const failure = failWith(500);

      expect(failure).toEqual(jasmine.any(AppHttpError));
      expect(failure).toEqual(jasmine.any(Error));
    });

    /** Lanza una petición que falla con el código dado y devuelve el error. */
    function failWith(status: number): AppHttpError | undefined {
      let failure: AppHttpError | undefined;
      http.get(URL).subscribe({ error: (error) => (failure = error) });

      backend.expectOne(URL).flush(null, { status, statusText: 'Error' });

      return failure;
    }
  });

  describe('loadingInterceptor', () => {
    let loadingService: LoadingService;

    beforeEach(() => (loadingService = TestBed.inject(LoadingService)));

    it('marca la carga mientras la petición está en vuelo', () => {
      expect(loadingService.loading()).toBe(false);

      http.get(URL).subscribe();
      expect(loadingService.loading()).toBe(true);

      backend.expectOne(URL).flush([]);
      expect(loadingService.loading()).toBe(false);
    });

    it('cuenta las peticiones simultáneas: la primera en volver no lo apaga', () => {
      http.get(URL).subscribe();
      http.get(URL).subscribe();
      expect(loadingService.pendingCount()).toBe(2);

      const [first, second] = backend.match(URL);
      first.flush([]);

      expect(loadingService.loading())
        .withContext('Sigue habiendo una petición en curso')
        .toBe(true);

      second.flush([]);
      expect(loadingService.loading()).toBe(false);
    });

    it('lo apaga también cuando la petición falla', () => {
      http.get(URL).subscribe({ error: () => undefined });

      backend.expectOne(URL).flush(null, { status: 500, statusText: 'Error' });

      expect(loadingService.loading()).toBe(false);
    });

    it('lo apaga cuando la petición se cancela', () => {
      // Es lo que ocurre con el switchMap de la búsqueda del Día 16.
      const subscription = http.get(URL).subscribe();
      expect(loadingService.loading()).toBe(true);

      subscription.unsubscribe();

      expect(loadingService.loading()).toBe(false);
      backend.expectOne(URL);
    });
  });
});
