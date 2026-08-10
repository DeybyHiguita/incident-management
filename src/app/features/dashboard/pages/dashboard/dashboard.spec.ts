import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Dashboard } from './dashboard';
import { IncidentService } from '../../../../core/services/incident-service';
import { MOCK_INCIDENTS } from '../../../../core/mocks/incidents.mock';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let service: IncidentService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([])],
    }).compileComponents();

    service = TestBed.inject(IncidentService);
    service.reset();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra los mismos indicadores que calcula el servicio', () => {
    expect(stat('Totales')).toBe(String(service.totalCount()));
    expect(stat('Críticas')).toBe(String(service.criticalCount()));
    expect(stat('Abiertas')).toBe(String(service.openCount()));
  });

  it('lista las incidencias críticas con enlace a su detalle', () => {
    const critical = MOCK_INCIDENTS.filter((i) => i.priority === 'CRITICAL');

    const links: HTMLAnchorElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.dashboard__critical-item a'),
    );

    expect(links.length).toBe(critical.length);
    expect(links[0].getAttribute('href')).toBe(`/incidents/${critical[0].id}`);
  });

  it('se actualiza solo cuando cambian los datos del servicio', () => {
    const critical = MOCK_INCIDENTS.find((i) => i.priority === 'CRITICAL')!;

    service.remove(critical.id);
    fixture.detectChanges();

    expect(stat('Críticas')).toBe('0');
    expect(fixture.nativeElement.textContent).toContain('No hay incidencias críticas');
  });

  it('ofrece accesos directos a registrar y al listado', () => {
    const hrefs = Array.from<HTMLAnchorElement>(
      fixture.nativeElement.querySelectorAll('.dashboard__actions a'),
    ).map((a) => a.getAttribute('href'));

    expect(hrefs).toContain('/incidents/new');
    expect(hrefs).toContain('/incidents');
  });

  function stat(label: string): string {
    const items = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.stats__item'));
    const item = items.find(
      (candidate) => candidate.querySelector('.stats__label')?.textContent?.trim() === label,
    );

    return item?.querySelector('.stats__value')?.textContent?.trim() ?? '';
  }
});
