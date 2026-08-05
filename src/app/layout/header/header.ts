import { Component, Input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FocusWithin } from '../../shared/directives/focus-within';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, FocusWithin],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  @Input() systemTitle = '';
  @Input() userName = '';

  protected readonly showUserDetails = signal(true);

  toggleUserDetails(): void {
    this.showUserDetails.update((visible) => !visible);
  }
}
