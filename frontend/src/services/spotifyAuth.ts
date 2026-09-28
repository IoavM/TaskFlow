// Spotify OAuth 2.0 PKCE Helper for TaskFlow

export interface SpotifyUser {
  id: string;
  display_name: string;
  email?: string;
  images?: { url: string }[];
  product?: string; // 'premium' | 'free'
}

export interface SpotifyAuthData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  user: SpotifyUser;
}

const SPOTIFY_CLIENT_ID_KEY = 'taskflow_spotify_client_id';
const SPOTIFY_AUTH_DATA_KEY = 'taskflow_spotify_auth';
const SPOTIFY_VERIFIER_KEY = 'taskflow_spotify_verifier';

function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64encode(input: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export const spotifyAuth = {
  getClientId(): string {
    return localStorage.getItem(SPOTIFY_CLIENT_ID_KEY) || '';
  },

  setClientId(clientId: string): void {
    localStorage.setItem(SPOTIFY_CLIENT_ID_KEY, clientId.trim());
  },

  getStoredAuth(): SpotifyAuthData | null {
    try {
      const data = localStorage.getItem(SPOTIFY_AUTH_DATA_KEY);
      if (!data) return null;
      const parsed: SpotifyAuthData = JSON.parse(data);
      if (Date.now() > parsed.expiresAt) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  logout(): void {
    localStorage.removeItem(SPOTIFY_AUTH_DATA_KEY);
  },

  async startLogin(clientId: string, redirectUri: string): Promise<void> {
    this.setClientId(clientId);
    const verifier = generateRandomString(64);
    const hashed = await sha256(verifier);
    const challenge = base64encode(hashed);

    localStorage.setItem(SPOTIFY_VERIFIER_KEY, verifier);

    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-read-playback-state',
      'user-modify-playback-state',
      'streaming',
      'playlist-read-private',
      'playlist-read-collaborative',
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: scopes,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      redirect_uri: redirectUri,
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  },

  async handleCallback(code: string, redirectUri: string): Promise<SpotifyAuthData | null> {
    const clientId = this.getClientId();
    const verifier = localStorage.getItem(SPOTIFY_VERIFIER_KEY);
    if (!clientId || !verifier) return null;

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          code_verifier: verifier,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al intercambiar token de Spotify');
      }

      const data = await response.json();
      const accessToken = data.access_token;
      const expiresIn = data.expires_in || 3600;

      // Fetch user profile
      const userRes = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const user: SpotifyUser = await userRes.json();

      const authData: SpotifyAuthData = {
        accessToken,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + expiresIn * 1000,
        user,
      };

      localStorage.setItem(SPOTIFY_AUTH_DATA_KEY, JSON.stringify(authData));
      localStorage.removeItem(SPOTIFY_VERIFIER_KEY);
      return authData;
    } catch (err) {
      console.error('[SpotifyAuth] Callback error:', err);
      return null;
    }
  },

  async getUserPlaylists(accessToken: string): Promise<any[]> {
    try {
      const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=10', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.items || [];
    } catch {
      return [];
    }
  },
};
