import { Injectable, signal } from '@angular/core';
import { User } from '../models/user.model';
import { MOCK_USERS } from '../mocks/users.mock';

/**
 * Acceso a los usuarios y a la sesión activa.
 *
 * Existe por la misma razón que `IncidentService`: ningún componente debe
 * saber de dónde salen los datos. Hoy la "sesión" es el primer usuario
 * simulado; mañana será lo que devuelva el login.
 */
@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly collection = signal<readonly User[]>(MOCK_USERS);

  /** Usuario de la sesión activa. */
  private readonly session = signal<User>(MOCK_USERS[0]);

  readonly currentUser = this.session.asReadonly();

  /** Todos los usuarios, en un arreglo nuevo. */
  getAll(): readonly User[] {
    return [...this.collection()];
  }

  /** Busca por identificador. `undefined` si no existe. */
  getById(id: string): User | undefined {
    return this.collection().find((user) => user.id === id);
  }
}
