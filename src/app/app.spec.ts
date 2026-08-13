import { TestBed, fakeAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { loginForTest, prepareApi, provideTestApi } from './testing/api-testing';

describe('App', () => {
  beforeEach(async () => {
    prepareApi();
    await TestBed.configureTestingModule({
      imports: [App],
      // El header usa routerLink y consulta la sesión.
      providers: [provideRouter([]), provideTestApi()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the system title inside the header', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Sistema de Gestión de Incidencias');
  });

  it('should render the footer', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('footer')).toBeTruthy();
  });

  it('sin sesión, la cabecera no ofrece navegación', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });

  it('con sesión, la cabecera muestra al usuario', fakeAsync(() => {
    loginForTest();

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('nav')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Ana Torres');
  }));
});
