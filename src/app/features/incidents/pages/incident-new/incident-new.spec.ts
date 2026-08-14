import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { loadIncidents, prepareApi, provideTestApi } from '../../../../testing/api-testing';

import { IncidentNew } from './incident-new';
import { IncidentStore } from '../../../../core/state/incident-store';
import { UserService } from '../../../../core/services/user-service';

describe('IncidentNew', () => {
  let component: IncidentNew;
  let fixture: ComponentFixture<IncidentNew>;
  let store: IncidentStore;
  let router: Router;

  beforeEach(async () => {
    prepareApi();
    await TestBed.configureTestingModule({
      imports: [IncidentNew],
      providers: [provideRouter([]), provideTestApi()],
    }).compileComponents();
  });

  beforeEach(fakeAsync(() => {
    store = loadIncidents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(IncidentNew);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra el formulario de registro', () => {
    expect(fixture.nativeElement.querySelector('app-incident-form')).toBeTruthy();
  });

  it('registra la incidencia con el usuario de la sesión', fakeAsync(() => {
    const currentUser = TestBed.inject(UserService).currentUser();
    const before = store.getAll().length;

    submitValidForm();

    expect(store.getAll().length).toBe(before + 1);
    expect(store.getAll().at(-1)!.reporterId).toBe(currentUser.id);
  }));

  it('navega al detalle de la incidencia recién creada', fakeAsync(() => {
    submitValidForm();

    const created = store.getAll().at(-1)!;
    expect(router.navigate).toHaveBeenCalledWith(['/incidents', created.id]);
  }));

  it('no navega si el formulario es inválido', fakeAsync(() => {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(router.navigate).not.toHaveBeenCalled();
  }));

  it('cancelar vuelve al listado sin registrar nada', fakeAsync(() => {
    const before = store.getAll().length;

    clickButton('Cancelar');

    expect(router.navigate).toHaveBeenCalledWith(['/incidents']);
    expect(store.getAll().length).toBe(before);
  }));

  function clickButton(label: string): void {
    Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === label)!
      .click();
    tick();
    fixture.detectChanges();
  }

  function submitValidForm(): void {
    setValue('#incident-title', 'Fuga en el aire acondicionado', 'input');
    setValue('#incident-description', 'Gotea sobre los equipos del rack.', 'input');
    setValue('#incident-category', 'Infraestructura', 'input');
    setValue('#incident-priority', 'HIGH', 'change');

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    tick();
    fixture.detectChanges();
  }

  function setValue(selector: string, value: string, eventName: string): void {
    const control: HTMLInputElement = fixture.nativeElement.querySelector(selector);
    control.value = value;
    control.dispatchEvent(new Event(eventName));
    fixture.detectChanges();
  }
});
