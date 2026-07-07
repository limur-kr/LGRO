export {}

declare global {
  namespace kakao.maps {
    class LatLng {
      constructor(lat: number, lng: number)
      getLat(): number
      getLng(): number
    }

    class LatLngBounds {
      extend(latlng: LatLng): void
    }

    class Map {
      constructor(container: HTMLElement, options: { center: LatLng; level: number })
      setLevel(level: number): void
      getLevel(): number
      setBounds(bounds: LatLngBounds): void
      panTo(latlng: LatLng): void
      getCenter(): LatLng
    }

    class Marker {
      constructor(options: { map: Map; position: LatLng; title?: string })
      setMap(map: Map | null): void
    }

    const event: {
      addListener(target: Marker | Map, type: string, handler: () => void): void
    }

    function load(callback: () => void): void
  }

  interface KakaoAuthObj {
    access_token: string
    token_type: string
    expires_in: number
    refresh_token?: string
  }

  interface KakaoNamespace {
    init(jsKey: string): void
    isInitialized(): boolean
    Auth: {
      login(options: { success: (authObj: KakaoAuthObj) => void; fail: (error: unknown) => void }): void
    }
  }

  interface Window {
    kakao: typeof kakao
    KAKAO_MAP_APP_KEY?: string
    Kakao: KakaoNamespace
  }
}
