import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './layout/header/header';
import { Footer } from './layout/footer/footer';
import { MOCK_USERS } from './core/mocks/users.mock';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly systemTitle = 'Sistema de Gestión de Incidencias';
  protected readonly currentUser = MOCK_USERS[0];
}
