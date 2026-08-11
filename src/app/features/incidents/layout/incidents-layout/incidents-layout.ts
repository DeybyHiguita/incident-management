import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Marco común de la funcionalidad de incidencias.
 *
 * No pinta ninguna pantalla: aporta el `<router-outlet>` donde se muestran
 * las rutas hijas (`''`, `new`, `:id`, `:id/edit`) y lo que comparten
 * todas, como el encabezado de la sección.
 */
@Component({
  selector: 'app-incidents-layout',
  imports: [RouterOutlet],
  templateUrl: './incidents-layout.html',
  styleUrl: './incidents-layout.scss',
})
export class IncidentsLayout {}
