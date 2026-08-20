import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { DashboardStats } from './dashboard-stats';
import { IncidentStore } from '../../../../core/state/incident-store';
import { MOCK_INCIDENTS } from '../../../../core/mocks/incidents.mock';
import { loadIncidents, prepareApi, provideTestApi } from '../../../../testing/api-testing';

describe('DashboardStats', () => {
  let component: DashboardStats;
  let fixture: ComponentFixture<DashboardStats>;
  let store: IncidentStore;

  beforeEach(async () => {
    prepareApi();
    await TestBed.configureTestingModule({
      imports: [DashboardStats],
      providers: [provideTestApi()],
    }).compileComponents();
  });

  beforeEach(fakeAsync(() => {
    store = loadIncidents();

    fixture = TestBed.createComponent(DashboardStats);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra los tres indicadores del store', () => {
    expect(stat('Totales')).toBe(String(store.totalCount()));
    expect(stat('Críticas')).toBe(String(store.criticalCount()));
    expect(stat('Abiertas')).toBe(String(store.openCount()));
  });

  it('desglosa por los cuatro estados', () => {
    const labels = rows().map((row) => row.querySelector('.dashboard-stats-row-label')?.textContent?.trim());

    expect(labels).toEqual(['Abiertas', 'En progreso', 'Resueltas', 'Cerradas']);
  });

  it('cuenta cada estado y calcula su porcentaje', () => {
    const open = MOCK_INCIDENTS.filter((i) => i.status === 'OPEN').length;
    const expected = Math.round((open / MOCK_INCIDENTS.length) * 100);

    expect(rowFor('Abiertas')).toContain(`${open} (${expected}%)`);
  });

  it('los porcentajes suman 100', () => {
    const total = component['breakdown']().reduce((sum, row) => sum + row.percent, 0);

    expect(total).toBe(100);
  });

  it('usa <meter>, que ya aporta el rol y el valor a un lector de pantalla', () => {
    const meters: HTMLMeterElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('meter'),
    );

    expect(meters.length).toBe(4);
    expect(meters[0].getAttribute('aria-label')).toContain('Abiertas');
  });

  it('sin incidencias no divide por cero', fakeAsync(() => {
    for (const incident of store.getAll()) {
      store.remove(incident.id).subscribe();
      tick();
    }
    fixture.detectChanges();

    expect(stat('Totales')).toBe('0');
    expect(component['breakdown']().every((row) => row.percent === 0)).toBe(true);
  }));

  it('se actualiza solo cuando cambia el store', fakeAsync(() => {
    const critical = MOCK_INCIDENTS.find((i) => i.priority === 'CRITICAL')!;

    store.remove(critical.id).subscribe();
    tick();
    fixture.detectChanges();

    expect(stat('Críticas')).toBe('0');
  }));

  function rows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.dashboard-stats-row'));
  }

  function rowFor(label: string): string {
    const row = rows().find((candidate) => candidate.textContent?.includes(label));
    return row?.textContent ?? '';
  }

  function stat(label: string): string {
    const items = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.stats-item'));
    const item = items.find(
      (candidate) => candidate.querySelector('.stats-label')?.textContent?.trim() === label,
    );

    return item?.querySelector('.stats-value')?.textContent?.trim() ?? '';
  }
});
