import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NotFound } from './not-found';

describe('NotFound', () => {
  let component: NotFound;
  let fixture: ComponentFixture<NotFound>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFound],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFound);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('explica que la página no existe', () => {
    expect(fixture.nativeElement.textContent).toContain('Página no encontrada');
  });

  it('ofrece salidas hacia el panel y el listado', () => {
    const hrefs = Array.from<HTMLAnchorElement>(
      fixture.nativeElement.querySelectorAll('a'),
    ).map((a) => a.getAttribute('href'));

    expect(hrefs).toContain('/dashboard');
    expect(hrefs).toContain('/incidents');
  });
});
