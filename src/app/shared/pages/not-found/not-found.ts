import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {
  /** La URL que el usuario intentó abrir, para poder mostrársela. */
  protected readonly attemptedUrl = inject(Router).url;
}
