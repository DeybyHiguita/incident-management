import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { IncidentNew } from './incident-new';
import { IncidentService } from '../../../../core/services/incident-service';
import { UserService } from '../../../../core/services/user-service';

describe('IncidentNew', () => {
  let component: IncidentNew;
  let fixture: ComponentFixture<IncidentNew>;
  let service: IncidentService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentNew],
      providers: [provideRouter([])],
    }).compileComponents();

    service = TestBed.inject(IncidentService);
    service.reset();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(IncidentNew);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra el formulario de registro', () => {
    expect(fixture.nativeElement.querySelector('app-incident-form')).toBeTruthy();
  });

  it('registra la incidencia con el usuario de la sesión', () => {
    const currentUser = TestBed.inject(UserService).currentUser();
    const before = service.getAll().length;

    submitValidForm();

    expect(service.getAll().length).toBe(before + 1);
    expect(service.getAll().at(-1)!.reporterId).toBe(currentUser.id);
  });

  it('navega al detalle de la incidencia recién creada', () => {
    submitValidForm();

    const created = service.getAll().at(-1)!;
    expect(router.navigate).toHaveBeenCalledWith(['/incidents', created.id]);
  });

  it('no navega si el formulario es inválido', () => {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(router.navigate).not.toHaveBeenCalled();
  });

  function submitValidForm(): void {
    setValue('#incident-title', 'Fuga en el aire acondicionado', 'input');
    setValue('#incident-description', 'Gotea sobre los equipos del rack.', 'input');
    setValue('#incident-category', 'Infraestructura', 'input');
    setValue('#incident-priority', 'HIGH', 'change');

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function setValue(selector: string, value: string, eventName: string): void {
    const control: HTMLInputElement = fixture.nativeElement.querySelector(selector);
    control.value = value;
    control.dispatchEvent(new Event(eventName));
    fixture.detectChanges();
  }
});
