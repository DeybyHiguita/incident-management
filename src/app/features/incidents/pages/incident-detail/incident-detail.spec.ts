import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { IncidentDetail } from './incident-detail';
import { IncidentService } from '../../../../core/services/incident-service';
import { MOCK_INCIDENTS } from '../../../../core/mocks/incidents.mock';

describe('IncidentDetail', () => {
  let component: IncidentDetail;
  let fixture: ComponentFixture<IncidentDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentDetail],
      providers: [provideRouter([])],
    }).compileComponents();

    TestBed.inject(IncidentService).reset();

    fixture = TestBed.createComponent(IncidentDetail);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    setId('inc-001');
    expect(component).toBeTruthy();
  });

  describe('cuando la incidencia existe', () => {
    beforeEach(() => setId('inc-003'));

    it('muestra sus datos principales', () => {
      const incident = MOCK_INCIDENTS.find((i) => i.id === 'inc-003')!;

      expect(text()).toContain(incident.title);
      expect(text()).toContain(incident.description);
      expect(text()).toContain(incident.category);
    });

    it('traduce la prioridad a su etiqueta legible', () => {
      expect(text()).toContain('Crítica');
    });

    it('resuelve los identificadores de usuario a nombres', () => {
      // inc-003 la reporta u-004 y la atiende u-003.
      expect(text()).toContain('Carlos Peña');
      expect(text()).toContain('Marta Ruiz');
    });

    it('aplica el resaltado de incidencia crítica', () => {
      expect(fixture.nativeElement.querySelector('.is-critical')).toBeTruthy();
    });

    it('ofrece un enlace de vuelta al listado', () => {
      const back: HTMLAnchorElement = fixture.nativeElement.querySelector('a[href="/incidents"]');

      expect(back).toBeTruthy();
    });
  });

  describe('cuando la incidencia no existe', () => {
    beforeEach(() => setId('inc-999'));

    it('avisa de que no se encontró, sin romperse', () => {
      expect(text()).toContain('Incidencia no encontrada');
      expect(text()).toContain('INC-999');
    });

    it('sigue ofreciendo la vuelta al listado', () => {
      expect(fixture.nativeElement.querySelector('a[href="/incidents"]')).toBeTruthy();
    });
  });

  it('reacciona si la incidencia se elimina mientras se está viendo', () => {
    setId('inc-001');
    expect(text()).toContain('No se puede iniciar sesión');

    TestBed.inject(IncidentService).remove('inc-001');
    fixture.detectChanges();

    expect(text()).toContain('Incidencia no encontrada');
  });

  function setId(id: string): void {
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
  }

  function text(): string {
    return fixture.nativeElement.textContent ?? '';
  }
});
