import { ComponentFixture, TestBed, fakeAsync } from '@angular/core/testing';

import { AdminUsers } from './admin-users';
import { MOCK_USERS } from '../../../../core/mocks/users.mock';
import { loginForTest, prepareApi, provideTestApi } from '../../../../testing/api-testing';

describe('AdminUsers', () => {
  let component: AdminUsers;
  let fixture: ComponentFixture<AdminUsers>;

  beforeEach(async () => {
    prepareApi();
    await TestBed.configureTestingModule({
      imports: [AdminUsers],
      providers: [provideTestApi()],
    }).compileComponents();
  });

  beforeEach(fakeAsync(() => {
    loginForTest('ADMIN');

    fixture = TestBed.createComponent(AdminUsers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lista todos los usuarios del sistema', () => {
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');

    expect(rows.length).toBe(MOCK_USERS.length);
  });

  it('muestra nombre, correo y rol de cada uno', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Luis Gómez');
    expect(text).toContain('luis.gomez@example.com');
    expect(text).toContain('AGENT');
  });

  it('señala al usuario que está viendo la página', () => {
    const rows = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('tbody tr'));
    const marked = rows.filter((row) => row.textContent?.includes('(tú)'));

    expect(marked.length).toBe(1);
    expect(marked[0].textContent).toContain('Ana Torres');
  });

  it('usa una tabla con encabezados asociados a sus columnas', () => {
    const headers = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('thead th'));

    expect(headers.length).toBe(3);
    for (const header of headers) {
      expect(header.getAttribute('scope')).toBe('col');
    }
  });
});
