import {
  ComponentFixture,
  DeferBlockBehavior,
  DeferBlockState,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { loadIncidents, prepareApi, provideTestApi } from '../../../../testing/api-testing';

import { Dashboard } from './dashboard';
import { IncidentStore } from '../../../../core/state/incident-store';
import { MOCK_INCIDENTS } from '../../../../core/mocks/incidents.mock';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let store: IncidentStore;

  beforeEach(async () => {
    prepareApi();
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([]), provideTestApi()],
    }).compileComponents();
  });

  beforeEach(fakeAsync(() => {
    // El servicio carga en su constructor: hay que dejar llegar la respuesta.
    store = loadIncidents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lista las incidencias críticas con enlace a su detalle', () => {
    const critical = MOCK_INCIDENTS.filter((i) => i.priority === 'CRITICAL');

    const links: HTMLAnchorElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.dashboard-critical-item a'),
    );

    expect(links.length).toBe(critical.length);
    expect(links[0].getAttribute('href')).toBe(`/incidents/${critical[0].id}`);
  });

  it('la lista de críticas se actualiza sola al cambiar el store', fakeAsync(() => {
    const critical = MOCK_INCIDENTS.find((i) => i.priority === 'CRITICAL')!;

    store.remove(critical.id).subscribe();
    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay incidencias críticas');
  }));

  describe('carga diferida de los indicadores (Día 27)', () => {
    it('mientras no se resuelve, muestra el esqueleto y no el panel', () => {
      // Por defecto, en pruebas los bloques @defer se quedan en el
      // marcador de posición: es justo el estado que ve el usuario al
      // entrar, antes de que el navegador esté ocioso.
      expect(fixture.nativeElement.querySelector('.stats-item--skeleton')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('app-dashboard-stats')).toBeNull();
    });

    it('el esqueleto reserva el hueco sin ensuciar el texto accesible', () => {
      const skeleton = fixture.nativeElement.querySelector('.stats');

      expect(skeleton.getAttribute('aria-hidden')).toBe('true');
    });

    it('al resolverse, aparece el panel y desaparece el esqueleto', async () => {
      const [block] = await fixture.getDeferBlocks();

      await block.render(DeferBlockState.Complete);

      expect(fixture.nativeElement.querySelector('app-dashboard-stats')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.stats-item--skeleton')).toBeNull();
    });

    it('tiene estado de carga', async () => {
      const [block] = await fixture.getDeferBlocks();

      await block.render(DeferBlockState.Loading);

      expect(fixture.nativeElement.textContent).toContain('Cargando indicadores');
    });

    it('tiene estado de error, por si el fragmento no llega', async () => {
      const [block] = await fixture.getDeferBlocks();

      await block.render(DeferBlockState.Error);

      const banner = fixture.nativeElement.querySelector('.error-banner');
      expect(banner.textContent).toContain('No se pudieron cargar los indicadores');
      expect(banner.getAttribute('role')).toBe('alert');
    });
  });

  it('ofrece accesos directos a registrar y al listado', () => {
    const hrefs = Array.from<HTMLAnchorElement>(
      fixture.nativeElement.querySelectorAll('.dashboard-actions a'),
    ).map((a) => a.getAttribute('href'));

    expect(hrefs).toContain('/incidents/new');
    expect(hrefs).toContain('/incidents');
  });

});
