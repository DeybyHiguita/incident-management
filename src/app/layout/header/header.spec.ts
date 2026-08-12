import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Header } from './header';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      // El enlace de navegación usa routerLink: necesita un Router configurado.
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('expone la navegación principal con un nombre accesible', () => {
    const nav: HTMLElement = fixture.nativeElement.querySelector('nav');

    expect(nav.getAttribute('aria-label')).toBe('Navegación principal');
    expect(nav.querySelectorAll('a').length).toBeGreaterThan(0);
  });

  it('describe con aria-expanded si el detalle de usuario está visible', () => {
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.app-header-toggle');

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-controls')).toBe('user-details');
    expect(fixture.nativeElement.querySelector('#user-details')).toBeTruthy();

    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('#user-details')).toBeNull();
  });
});
