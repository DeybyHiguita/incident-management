import { ComponentFixture, TestBed, fakeAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Forbidden } from './forbidden';
import { loginForTest, prepareApi, provideTestApi } from '../../../testing/api-testing';

describe('Forbidden', () => {
  let component: Forbidden;
  let fixture: ComponentFixture<Forbidden>;

  beforeEach(async () => {
    prepareApi();
    await TestBed.configureTestingModule({
      imports: [Forbidden],
      providers: [provideRouter([]), provideTestApi()],
    }).compileComponents();

    fixture = TestBed.createComponent(Forbidden);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('explica que no hay permisos', () => {
    expect(fixture.nativeElement.textContent).toContain('Acceso denegado');
  });

  it('dice con qué cuenta y rol se ha entrado, para que se entienda el motivo', fakeAsync(() => {
    loginForTest('REQUESTER');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Carlos Peña');
    expect(text).toContain('REQUESTER');
  }));

  it('ofrece salidas a sitios donde el usuario sí puede entrar', () => {
    const hrefs = Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('a')).map(
      (a) => a.getAttribute('href'),
    );

    expect(hrefs).toContain('/dashboard');
    expect(hrefs).toContain('/incidents');
  });
});
