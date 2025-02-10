export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationData {
  coordinates: Coordinates;
  osGrid: string;
}