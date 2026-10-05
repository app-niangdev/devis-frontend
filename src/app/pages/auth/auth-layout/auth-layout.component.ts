import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss'
})
export class AuthLayoutComponent {
  protected readonly year = new Date().getFullYear();

  protected readonly highlights = [
    'Tableaux de bord en temps réel',
    'Gestion fine des accès',
    'Rapports exportables'
  ];
}
