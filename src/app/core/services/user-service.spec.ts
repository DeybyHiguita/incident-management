import { TestBed } from '@angular/core/testing';

import { UserService } from './user-service';
import { MOCK_USERS } from '../mocks/users.mock';
import { User } from '../models/user.model';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('expone el usuario de la sesión activa', () => {
    expect(service.currentUser().name).toBe(MOCK_USERS[0].name);
  });

  it('la sesión es una señal de solo lectura', () => {
    expect('set' in service.currentUser).toBe(false);
    expect('update' in service.currentUser).toBe(false);
  });

  it('devuelve todos los usuarios en un arreglo nuevo', () => {
    const first = service.getAll();

    expect(first.length).toBe(MOCK_USERS.length);
    expect(first).not.toBe(service.getAll());
  });

  it('modificar lo devuelto no altera el estado del servicio', () => {
    const copy = service.getAll() as User[];
    copy.length = 0;

    expect(service.getAll().length).toBe(MOCK_USERS.length);
  });

  it('busca por identificador', () => {
    expect(service.getById('u-002')?.name).toBe('Luis Gómez');
  });

  it('devuelve undefined si el identificador no existe', () => {
    expect(service.getById('no-existe')).toBeUndefined();
  });
});
