import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadingIndicator } from './loading-indicator';

describe('LoadingIndicator', () => {
  let component: LoadingIndicator;
  let fixture: ComponentFixture<LoadingIndicator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LoadingIndicator] }).compileComponents();

    fixture = TestBed.createComponent(LoadingIndicator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('usa un mensaje por defecto', () => {
    expect(fixture.nativeElement.textContent.trim()).toBe('Cargando…');
  });

  it('acepta un mensaje propio', () => {
    fixture.componentRef.setInput('message', 'Guardando…');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('Guardando…');
  });

  it('se anuncia sin interrumpir: role="status", no "alert"', () => {
    const status = fixture.nativeElement.querySelector('[role="status"]');

    expect(status).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('el girador es decorativo y no se lee', () => {
    expect(
      fixture.nativeElement.querySelector('.loading-spinner').getAttribute('aria-hidden'),
    ).toBe('true');
  });
});
