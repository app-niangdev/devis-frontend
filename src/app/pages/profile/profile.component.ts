import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ROLE_LABELS } from '../../core/models/auth.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  private readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);

  protected readonly user = this.authService.currentUser;
  protected readonly roleLabels = ROLE_LABELS;

  protected phoneTwo = this.user()?.phone_two ?? '';
  protected address = this.user()?.address ?? '';

  protected currentPassword = '';
  protected password = '';
  protected passwordConfirmation = '';

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  onSubmit(): void {
    if (this.isSubmitting()) {
      return;
    }

    if (this.password && this.password !== this.passwordConfirmation) {
      this.errorMessage.set('La confirmation du mot de passe ne correspond pas.');
      return;
    }

    if (this.password && !this.currentPassword) {
      this.errorMessage.set('Veuillez saisir votre mot de passe actuel.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload: {
      phone_two?: string | null;
      address?: string | null;
      current_password?: string;
      password?: string;
      password_confirmation?: string;
    } = {
      phone_two: this.phoneTwo || null,
      address: this.address || null
    };

    if (this.password) {
      payload.current_password = this.currentPassword;
      payload.password = this.password;
      payload.password_confirmation = this.passwordConfirmation;
    }

    this.authService.updateProfile(payload).subscribe({
      next: async () => {
        this.isSubmitting.set(false);
        this.currentPassword = '';
        this.password = '';
        this.passwordConfirmation = '';
        await this.notification.successAutoClose('Profil mis à jour', 'Vos informations ont été enregistrées.');
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message ?? 'Une erreur est survenue.');
      }
    });
  }
}
