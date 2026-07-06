export {}

declare global {
  interface GoogleTokenResponse {
    access_token: string
    error?: string
  }

  interface GoogleTokenClient {
    requestAccessToken(): void
  }

  interface GoogleOAuth2Namespace {
    initTokenClient(config: {
      client_id: string
      scope: string
      callback: (response: GoogleTokenResponse) => void
      error_callback?: (error: unknown) => void
    }): GoogleTokenClient
  }

  interface Window {
    google?: {
      accounts: {
        oauth2: GoogleOAuth2Namespace
      }
    }
  }
}
