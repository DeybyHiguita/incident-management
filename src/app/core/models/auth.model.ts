import { User } from './user.model';

/** Credenciales que introduce el usuario. */
export interface Credentials {
  readonly email: string;
  readonly password: string;
}

/**
 * Respuesta del servidor al autenticarse.
 *
 * Es la forma habitual de una API real: un token para las siguientes
 * peticiones y los datos del usuario para no tener que pedirlos aparte.
 */
export interface AuthResponse {
  readonly token: string;
  readonly user: User;
  /** Momento de caducidad, en milisegundos desde época. */
  readonly expiresAt: number;
}

/** Sesión guardada en el cliente. */
export interface Session {
  readonly token: string;
  readonly user: User;
  readonly expiresAt: number;
}
