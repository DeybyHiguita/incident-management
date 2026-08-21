import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthResponse, Credentials, Session } from '../models/auth.model';
import { User, UserRole } from '../models/user.model';
import { environment } from '../../../environments/environment';

/** Clave de la sesión en el almacenamiento del navegador. */
const STORAGE_KEY = 'incident-management.session';

/**
 * Autenticación simulada.
 *
 * Es el único punto que sabe si hay alguien dentro y quién es. El resto de
 * la aplicación solo lee sus señales, igual que hace con `IncidentService`
 * para los datos.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  /** Sesión activa. Privada: solo se cambia iniciando o cerrando sesión. */
  private readonly session = signal<Session | null>(this.restoreSession());

  readonly currentUser = computed<User | null>(() => this.session()?.user ?? null);

  readonly token = computed<string | null>(() => this.session()?.token ?? null);

  readonly isAuthenticated = computed(() => this.session() !== null);

  readonly role = computed<UserRole | null>(() => this.session()?.user.role ?? null);

  /**
   * `true` si el usuario tiene alguno de los roles indicados.
   *
   * Es el único sitio donde se decide «puede o no puede». Tanto los guards
   * como la interfaz preguntan aquí, así que no hay dos reglas distintas
   * para lo mismo.
   */
  hasAnyRole(...roles: readonly UserRole[]): boolean {
    const current = this.role();
    return current !== null && roles.includes(current);
  }

  // --- Permisos del dominio ------------------------------------------------
  //
  // Se nombran por lo que **permiten hacer**, no por el rol que lo permite.
  // Si mañana un rol nuevo puede editar, cambia esta línea y no las quince
  // plantillas que preguntan.

  /** Solo quien atiende incidencias puede modificarlas. */
  readonly canManageIncidents = computed(() => this.hasAnyRole('ADMIN', 'AGENT'));

  /** La administración es exclusiva del rol ADMIN. */
  readonly canAdminister = computed(() => this.hasAnyRole('ADMIN'));

  /**
   * Inicia sesión contra la API.
   *
   * La sesión solo se guarda cuando el servidor responde: si las
   * credenciales son incorrectas, el error sube al componente ya traducido
   * por el interceptor del Día 18.
   */
  login(credentials: Credentials): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/auth/login`, credentials)
      .pipe(tap((response) => this.startSession(response)));
  }

  /** Cierra la sesión y la borra del almacenamiento. */
  logout(): void {
    this.session.set(null);
    this.storage?.removeItem(STORAGE_KEY);
  }

  // --- Interno -------------------------------------------------------------

  private startSession(response: AuthResponse): void {
    const session: Session = {
      token: response.token,
      user: response.user,
      expiresAt: response.expiresAt,
    };

    this.session.set(session);
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  /**
   * Recupera la sesión guardada al arrancar, para que recargar la página no
   * eche al usuario.
   *
   * Descarta lo guardado si está caducado o corrupto: es mejor pedir el
   * inicio de sesión otra vez que arrancar con una sesión inválida.
   */
  private restoreSession(): Session | null {
    const raw = this.storage?.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    try {
      const session = JSON.parse(raw) as Session;

      if (!session?.token || !session?.user || session.expiresAt <= Date.now()) {
        this.storage?.removeItem(STORAGE_KEY);
        return null;
      }

      return session;
    } catch {
      this.storage?.removeItem(STORAGE_KEY);
      return null;
    }
  }

  /** `sessionStorage` puede no existir (renderizado en servidor, pruebas). */
  private get storage(): Storage | null {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  }
}
