import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './layout/header/header';
import { Footer } from './layout/footer/footer';
import { UserService } from './core/services/user-service';
import { LoadingService } from './core/services/loading-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly userService = inject(UserService);

  protected readonly systemTitle = 'Sistema de Gestión de Incidencias';

  /** Señal: si la sesión cambiara, la cabecera se actualizaría sola. */
  protected readonly currentUser = this.userService.currentUser;

  /** Actividad de red de toda la aplicación, la alimente quien la alimente. */
  protected readonly loading = inject(LoadingService).loading;
}
