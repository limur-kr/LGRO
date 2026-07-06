export {}

declare global {
  namespace kakao.maps {
    class LatLng {
      constructor(lat: number, lng: number)
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
    }

    class Marker {
      constructor(options: { map: Map; position: LatLng; title?: string })
      setMap(map: Map | null): void
    }

    const event: {
      addListener(target: Marker, type: string, handler: () => void): void
    }

    function load(callback: () => void): void
  }

  interface Window {
    kakao: typeof kakao
    KAKAO_MAP_APP_KEY?: string
  }
}
