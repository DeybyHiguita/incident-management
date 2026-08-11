import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { loadIncidents, prepareApi, provideTestApi } from '../../../../testing/api-testing';

import { IncidentEdit } from './incident-edit';
import { IncidentService } from '../../../../core/services/incident-service';
import { MOCK_INCIDENTS } from '../../../../core/mocks/incidents.mock';

describe('IncidentEdit', () => {
  let component: IncidentEdit;
  let fixture: ComponentFixture<IncidentEdit>;
  let service: IncidentService;
  let router: Router;

  beforeEach(async () => {
    prepareApi();
    await TestBed.configureTestingModule({
      imports: [IncidentEdit],
      providers: [provideRouter([]), provideTestApi()],
    }).compileComponents();
  });

  beforeEach(fakeAsync(() => {
    service = loadIncidents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(IncidentEdit);
    component = fixture.componentInstance;
  }));

  it('should create', () => {
    setId('inc-001');
    expect(component).toBeTruthy();
  });

  it('carga el formulario con los datos de la incidencia', () => {
    const incident = MOCK_INCIDENTS[0];

    setId(incident.id);

    expect(field('#incident-title').value).toBe(incident.title);
    expect(field('#incident-description').value).toBe(incident.description);
    expect(field('#incident-category').value).toBe(incident.category);
  });

  it('nombra la acción como guardar, no como registrar', () => {
    setId('inc-001');

    expect(submitButton().textContent?.trim()).toBe('Guardar cambios');
  });

  it('guarda los cambios en el servicio', fakeAsync(() => {
    setId('inc-001');

    setValue('#incident-title', 'Título corregido tras revisión', 'input');
    submit();

    expect(service.getById('inc-001')?.title).toBe('Título corregido tras revisión');
    }));

  it('conserva el identificador y la fecha de creación', fakeAsync(() => {
    const original = MOCK_INCIDENTS[0];
    setId(original.id);

    setValue('#incident-title', 'Título corregido tras revisión', 'input');
    submit();

    const updated = service.getById(original.id)!;
    expect(updated.id).toBe(original.id);
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.updatedAt).not.toBe(original.updatedAt);
    }));

  it('vuelve al detalle tras guardar', fakeAsync(() => {
    setId('inc-001');

    setValue('#incident-title', 'Título corregido tras revisión', 'input');
    submit();

    expect(router.navigate).toHaveBeenCalledWith(['/incidents', 'inc-001']);
    }));

  it('no guarda ni navega si el formulario queda inválido', fakeAsync(() => {
    setId('inc-001');

    setValue('#incident-title', 'abc', 'input'); // por debajo del mínimo
    submit();

    expect(service.getById('inc-001')?.title).toBe(MOCK_INCIDENTS[0].title);
    expect(router.navigate).not.toHaveBeenCalled();
    }));

  it('avisa cuando el identificador no existe', () => {
    setId('inc-999');

    expect(fixture.nativeElement.textContent).toContain('Incidencia no encontrada');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  function setId(id: string): void {
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
  }

  function field(selector: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(selector);
  }

  function setValue(selector: string, value: string, eventName: string): void {
    const control = field(selector);
    control.value = value;
    control.dispatchEvent(new Event(eventName));
    fixture.detectChanges();
  }

  function submit(): void {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    tick();
    fixture.detectChanges();
  }

  function submitButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[type="submit"]');
  }
});
