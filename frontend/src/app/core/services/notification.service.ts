import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(`✓ ${message}`, '', { duration: 3000, panelClass: 'snack-success' });
  }
  error(message: string): void {
    this.snackBar.open(`✗ ${message}`, 'Fermer', { duration: 5000, panelClass: 'snack-error' });
  }
  info(message: string): void {
    this.snackBar.open(message, '', { duration: 3000 });
  }
}
