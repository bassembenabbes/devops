import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, take, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);

  // Attendre que Keycloak soit initialisé avant de vérifier
  return toObservable(auth.isReady).pipe(
    filter(ready => ready === true),   // attendre isReady = true
    take(1),
    switchMap(() => {
      console.log('Guard check — isReady:', auth.isReady(), 'isLoggedIn:', auth.isLoggedIn());
      console.log('User signal:', auth.user());
      if (auth.isLoggedIn()) return of(true);
      auth.login('/checkout');
      return of(false);
    })
  );
};