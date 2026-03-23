import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models/user.model';
import Keycloak from 'keycloak-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  private keycloak: Keycloak | null = null;

  private _user   = signal<User | null>(null);
  private _token  = signal<string | null>(null);
  private _ready  = signal(false);

  readonly user    = this._user.asReadonly();
  readonly token   = this._token.asReadonly();
  readonly isReady = this._ready.asReadonly();

  readonly isLoggedIn = computed(() =>
    this._user() !== null || this._token() !== null
  );
  readonly isAdmin     = computed(() => this._user()?.roles.includes('ADMIN') ?? false);
  readonly isSeller    = computed(() => this._user()?.roles.includes('SELLER') ?? false);
  readonly displayName = computed(() => {
    const u = this._user();
    return u ? `${u.firstName} ${u.lastName}`.trim() || u.username : '';
  });

   async init(): Promise<void> {
     try {
       this.keycloak = new Keycloak({
         url:      environment.keycloakUrl,
         realm:    environment.keycloakRealm,
         clientId: environment.keycloakClientId,
       });

       const authenticated = await this.keycloak.init({
         onLoad:           'check-sso',
         pkceMethod:       'S256',
         checkLoginIframe: false,
       });

       console.log('KC authenticated:', authenticated);

       if (authenticated) {
         this._token.set(this.keycloak.token ?? null);
         await this.loadUserProfile();
         this.scheduleTokenRefresh();
       }
     } catch (err) {
         console.error('KC ERREUR TYPE:', typeof err);
         console.error('KC ERREUR JSON:', JSON.stringify(err));
         console.error('KC ERREUR RAW:', err);
         if (err instanceof Error) {
           console.error('KC message:', err.message);
           console.error('KC stack:', err.stack);
         }
       } finally {
       this._ready.set(true);
     }
   }

/*
  async login(): Promise<void> {
    await this.keycloak?.login({ redirectUri: window.location.origin });
  }*/

  async login(redirectPath?: string): Promise<void> {
    const path = redirectPath ?? window.location.pathname + window.location.search;
    await this.keycloak?.login({
      redirectUri: window.location.origin + path
    });
  }

  async logout(): Promise<void> {
    this._user.set(null);
    this._token.set(null);
    await this.keycloak?.logout({ redirectUri: window.location.origin });
  }

  async getToken(): Promise<string | null> {
    if (!this.keycloak?.authenticated) return null;
    try {
      await this.keycloak.updateToken(30);
      const token = this.keycloak.token ?? null;
      this._token.set(token);
      return token;
    } catch {
      return this._token();
    }
  }

  private async loadUserProfile(): Promise<void> {
    if (!this.keycloak?.token) return;

    try {
      // Décoder le token JWT directement — pas de requête réseau
      const tokenParsed = this.keycloak.tokenParsed as any;
      const roles: string[] = (this.keycloak.realmAccess?.roles ?? [])
        .filter(r => ['USER', 'ADMIN', 'SELLER'].includes(r));

      this._user.set({
        id:        tokenParsed.sub ?? '',
        username:  tokenParsed.preferred_username ?? '',
        email:     tokenParsed.email ?? '',
        firstName: tokenParsed.given_name ?? '',
        lastName:  tokenParsed.family_name ?? '',
        roles,
      });
      this._token.set(this.keycloak.token ?? null);

      console.log('User chargé depuis token:', this._user());
    } catch (e) {
      console.error('loadUserProfile failed:', e);
    }
  }

  private scheduleTokenRefresh(): void {
    setInterval(async () => {
      try { await this.keycloak?.updateToken(60); }
      catch { console.warn('Token refresh failed'); }
    }, 60_000);
  }
}
