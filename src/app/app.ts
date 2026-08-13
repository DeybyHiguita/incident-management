import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './layout/header/header';
import { Footer } from './layout/footer/footer';
import { LoadingService } from './core/services/loading-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly systemTitle = 'Sistema de Gestión de Incidencias';

  /** Actividad de red de toda la aplicación, la alimente quien la alimente. */
  protected readonly loading = inject(LoadingService).loading;
}
